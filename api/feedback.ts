import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if GitHub token is configured
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { type, title, description, deviceInfo } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine labels based on type (defaults to enhancement if not specified)
    const labels = type === 'bug' ? ['bug'] : ['enhancement'];

    // Format issue body
    let body = `${description}\n\n`;

    if (deviceInfo) {
      body += `---\n\n**Device Info:**\n${deviceInfo}\n`;
    }

    body += `\n_Submitted via in-app feedback_`;

    // Create GitHub issue
    const response = await fetch(
      'https://api.github.com/repos/douglasdriving/home-fitness-tracker/issues',
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          body: body,
          labels: labels,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API error:', errorData);
      throw new Error('Failed to create issue');
    }

    const issue = await response.json();

    return res.status(200).json({
      success: true,
      issueUrl: issue.html_url,
      issueNumber: issue.number,
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    return res.status(500).json({
      error: 'Failed to submit feedback. Please try again later.',
    });
  }
}

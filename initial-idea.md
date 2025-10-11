# initial notes/brainstorm about this project
- A progressive, open-source, local-first web app that can easily be accessed and installed on both Android and Iphone.
- All data is stored locally on the users device
- It should target people with little experience working out who wants to build core strength to prevent back injuries, improve posture, and overall strength.

## Exercise list
- The app should contain a database/list of all possible exercises that are good for core strength building
- The exercises should target core muscle groups like abs, glutes, and lower back. (for now, this might be expanded later)
- It should also contain a description for how to do each exercise, possible with a link to a youtube video or an image. The instructions should be pulled from a legitamate source to make sure the user does the exercises in a proper way.
- The exercise is mapped onto the muscle group(s) it targets
- All exercises are possible to do at home with only a yoga mat and your own body
- Each exercise contains an estimated "weight" score for their respective muscle group, describing how heavy it is to do 1 rep in comparison to other exercises of the same group

## Workout plans
- Contains a generated "schedule" that the user can overview and follow. It should work like a list where the user can see their "next" workout.
- It should start with easy workouts, like 20 mins
- Each workout should show all exercises in the workout, how many sets, and how many repetition for each set.
- When the exercise plans are generated, it should mix and match these different exercises in a workout so that the user gets to work out each of the 3 important muscle groups every time, but also so that the workouts get varied.

## When the user does the workouts
- the app walks them through the workout step-by-step, exercise by exercise, and displays the sets, reps
- the can open/toggle the instructions (and the video/image if existing) if they need to.
- The user can then check off each set when they have completed it.
- If the user cannot do the required number of reps, they can edit it. If they edit the number of reps, the app automatically corrects the rest of the set to fit the capacity of the user. 
- If the exercise is timed, and not based on reps, the user can automatically start a countdown timer for the set inside the app. When the timer finishes, the set is automatically checked
- When all sets are checked, the exercise is checked
- When all exercises in a workout is checked, the entire workout is checked, and the user is done for the day.

## History
- All workouts should be logged in a users history, including inforation about what exercises, sets, reps, etc they did. Its important that the actual logged reps are stored, and not the ones in the initial workout plan, as the user might have adjusted the reps when they worked out.
- The user can view this history, seeing all the workouts they have done, and on what date they did it.
- All this historical data is stored locally.

## Progression
- When a workout is generated and the exercises, sets, and reps are determined, it builds on the users historical data.
- If the user has done the same exercise before, it slightly adds on to the workout load, a little bit, to make the user stronger and improve over time.
- If the user has not done an exercise before, the app estimates what they should be able to handle based on other exercises they have done with the same muscle group, using the heavyness score of the database
- the "next workout" is always generated right after a user has completed a one, so that it can take the new data into account for how to progress.

## First time calibration
- The first time the user uses the app, their strength in the 3 core muscle groups are estimated. The user is led through a couple of exercises that are useful for calibration and instructed to test how much they can do of each exercise. The user logs these number, and the app uses it to set the numbers for their first workout.

## Backups
The app provides a way for users to backup their data by uploading or syncing a file to google drive.
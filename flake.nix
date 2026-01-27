{
  description = "Home Fitness Tracker - React PWA for home fitness tracking";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            # Node.js 22 includes npm
          ];

          shellHook = ''
            echo "Home Fitness Tracker Development Environment"
            echo "Node.js: $(node --version)"
            echo "npm: $(npm --version)"
            echo ""
            echo "Run 'npm install' to install dependencies"
            echo "Run 'npm run dev' to start the development server"
          '';
        };
      }
    );
}

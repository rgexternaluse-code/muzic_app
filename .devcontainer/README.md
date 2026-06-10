Devcontainer for building Android APKs

How to use

1. Install Docker on your host machine.
2. In VS Code install 'Remote - Containers' extension.
3. Open the workspace and choose 'Reopen in Container'.
4. Once the container builds, run the VS Code Task 'Android: Assemble Debug'.

Notes
- The container installs OpenJDK and Android command-line tools. It uses the Gradle wrapper in the project to perform builds.
- If you need additional Android platforms or build-tools, update the `Dockerfile`.

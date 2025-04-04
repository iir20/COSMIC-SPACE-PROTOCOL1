# Instructions to Install Git on Windows

1. **Download Git:**
   - Go to the official Git website: [https://git-scm.com/download/win](https://git-scm.com/download/win)
   - The download should start automatically. If not, click on the link to download the latest version.

2. **Run the Installer:**
   - Locate the downloaded `.exe` file and double-click it to run the installer.

3. **Follow the Installation Wizard:**
   - Click "Next" to proceed through the installation steps.
   - You can choose the default options for most settings. However, pay attention to the following:
     - **Adjusting your PATH environment:** Choose "Git from the command line and also from 3rd-party software" to ensure Git is accessible from the command line.
     - **Choosing the SSH executable:** You can select "Use OpenSSH" for SSH connections.

4. **Complete the Installation:**
   - Click "Install" to complete the installation process.
   - Once finished, click "Finish" to exit the installer.

5. **Verify the Installation:**
   - Open a new Command Prompt or PowerShell window.
   - Type `git --version` and press Enter. You should see the installed version of Git.

6. **Initialize Your Project:**
   - Navigate to your project directory using the command line.
   - Run `git init` to initialize a new Git repository.
   - Add your files with `git add .`
   - Commit your changes with `git commit -m "Initial commit"`
   - Set the remote repository with `git remote add origin https://github.com/iir20/your-repo-name.git`
   - Finally, push your changes with `git push -u origin master`

After installing Git, you can follow these steps to push your project to your GitHub repository.

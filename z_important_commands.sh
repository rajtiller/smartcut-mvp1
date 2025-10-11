# Important Commands for Vite Projects
echo -e "This Script Should Be Run\n"
chmod -x "$0" # make this script non-executable
exit 1

# How to Start a Vite Dev Server (i.e. get the localhost running)
npm install # if not already installed
npm run dev

# How to Force a Vite dev server to restart/update its dependencies
npm run dev -- --force

# How to Deploy the App
npm run build # creates the dist/ folder
 # Then upload the dist/ folder to your hosting service 
 # (e.g. Netlify, Vercel, etc.)

# How to Push Changes to a Remote Repository via CLI (terminal)
gh auth login # Authenticate with GitHub CLI
gh repo create REMOTE-REPO-NAME --public --source=. --remote=origin --push

# How to Add Your Remote Repository & Branch (assuming remote repo already exists)
git remote add origin https://github.com/USERNAME/REMOTE_REPO_NAME.git

# How to Set Your Remote Branch
git remote set-url origin https://github.com/USERNAME/REMOTE_REPO_NAME.git

# How to Create a New Remote Branch
git checkout -b new-branch-name # creates and switches to new branch
git push -u origin new-branch-name # pushes and sets upstream

# How to Set the Remote Branch
git push -u origin branch_name # configures remote branch (branch_name is usually main or master)
 # Note: branch_name should be the same name as your local branch
 # Note: the above command is identical to "git push --set-upstream origin branch_name"

# How to Add a License to Your Project (Note: The repo should already have a LICENSE file)
gh repo edit --add-license apache-2.0

# How to Set a Remote Branch as Default
gh repo edit --default-branch master 

# How to Delete a Remote Branch
git push origin --delete branch-name 

# How to Rename a Remote Repository
gh repo rename NEW-REPO-NAME

# How to Delete a Local Git Repository
cd ..
rm -rf ./project_name.git
 # Note: To Delete Remote Repo, go to GitHub


# START BY RUNNING THIS SCRIPT!
# The script will remove error squiggles too.

# These Commands Set up a New Repo & Set up Remote Branch
# -------------------------------------------------------------------------------
# git init 
# repo_name="REMOTE-REPO-NAME"
# git add .
# git commit -m "initial commit"
# gh repo create $repo_name --public --source=. --remote=origin --push
# if [ $? -ne 0 ]; then
#   gh auth login # Authenticate with GitHub CLI
#   gh repo create $repo_name --public --source=. --remote=origin --push
# fi
# gh repo view --web  # opens the repo in browser
# git push -u origin master
# gh repo edit --default-branch master
# git push origin --delete main 
# # if you forget to rename $repo_name, you can run: gh repo rename NEW-REPO-NAME
# --------------------------------------------------------------------------------

npm install
npm run dev -- --open
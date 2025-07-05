@echo off
echo Initializing Git repository...
git init

echo Setting up Git user...
git config --local user.name "Mayank Daya"
git config --local user.email "mayank@example.com"

echo Setting up remote repository...
git remote remove origin
git remote add origin https://github.com/Mayankdaya/CodeClash.git

echo Staging files...
git add .

echo Committing changes...
git commit -m "Initial commit"

echo Pushing to GitHub...
git push -u origin main

echo Done!
pause 
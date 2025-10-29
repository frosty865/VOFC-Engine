# How to Set Master as Primary Branch on GitHub

## 🌐 **GitHub Web Interface Method**

### **Step 1: Navigate to Repository Settings**
1. Go to your GitHub repository
2. Click on **"Settings"** (top right of repository page)
3. In the left sidebar, click on **"Branches"**

### **Step 2: Change Default Branch**
1. Under **"Default branch"**, you'll see the current default branch (usually `main`)
2. Click the **switch icon** (🔄) or **"Change default branch"** button
3. Select **`master`** from the dropdown
4. Click **"Update"**
5. Confirm the change in the dialog box

### **Step 3: Confirm Change**
- GitHub will show a confirmation
- You may need to update references in pull requests or protected branch rules

## ⚙️ **Alternative: Using GitHub CLI**

If you have GitHub CLI installed:

```bash
gh repo edit --default-branch master
```

## 🔧 **After Changing Default Branch**

Once `master` is set as primary:

### **Update Your Local Repository**
```bash
# Rename your local branch to master (if it's currently main)
git branch -M master

# Set upstream tracking
git push -u origin master

# Delete local main branch if it exists
git branch -d main  # (safe delete)
# OR
git branch -D main  # (force delete if needed)
```

### **Update Remote References**
```bash
# Fetch latest changes
git fetch origin

# Remove local main branch reference
git branch -d main

# Ensure you're on master
git checkout master
```

## 📋 **Important Notes**

1. **Protected Branch Rules**: If `main` had protected branch rules, you'll need to:
   - Go to Settings → Branches
   - Update branch protection rules to apply to `master` instead

2. **Pull Requests**: Existing pull requests referencing `main` will need to be updated or recreated

3. **CI/CD**: If you have GitHub Actions or other CI/CD workflows:
   - Update workflow files to reference `master` instead of `main`
   - Update any deployment scripts or configurations

4. **Documentation**: Update any README or documentation that references `main` to use `master`

## 🚀 **Quick Setup After Changing Default Branch**

```bash
# In your local repository
cd "C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine"

# Ensure you're on master
git checkout master

# Pull latest changes
git pull origin master

# If you have local changes, push them
git push origin master
```

## ✅ **Verify the Change**

After setting master as primary:
1. Go to your repository main page
2. Check the branch selector - it should show `master` as the default
3. The branch dropdown will show `master` at the top with a star ⭐

## 🔄 **If You Want to Keep Both Branches**

If you want to keep both `main` and `master` but make `master` primary:

```bash
# Keep both branches
git checkout master
git push origin master

# Set master as primary in GitHub settings (web interface)
# Then optionally delete main branch:
# In GitHub: Settings → Branches → find main → Delete branch
```

---

**Note**: This is a repository setting that must be changed through GitHub's web interface or GitHub CLI. Git commands alone cannot change the default branch on GitHub.

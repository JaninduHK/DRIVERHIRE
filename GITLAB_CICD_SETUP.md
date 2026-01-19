# GitLab CI/CD Setup Guide for DRIVERHIRE

This guide explains how to set up automated deployments using GitLab CI/CD with SSH deployment to your VPS.

## Overview

The pipeline consists of three stages:
1. **Test** - Lints frontend and validates backend syntax
2. **Build** - Builds the frontend for production
3. **Deploy** - Deploys to VPS via SSH (manual trigger)

## Prerequisites

### On Your VPS

1. **Install PM2** (Process Manager for Node.js):
   ```bash
   sudo npm install -g pm2
   ```

2. **Create a deployment user** (recommended for security):
   ```bash
   sudo adduser deploy
   sudo usermod -aG sudo deploy
   ```

3. **Set up the application directory**:
   ```bash
   sudo mkdir -p /var/www/driverhire
   sudo chown deploy:deploy /var/www/driverhire
   ```

4. **Clone the repository** (first time only):
   ```bash
   cd /var/www/driverhire
   git clone https://gitlab.com/YOUR_USERNAME/driverhire.git .
   ```

5. **Create logs directory**:
   ```bash
   mkdir -p /var/www/driverhire/logs
   ```

6. **Configure passwordless sudo for nginx reload** (optional but recommended):
   ```bash
   sudo visudo
   # Add this line:
   deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx
   ```

## GitLab Configuration

### Step 1: Mirror Repository to GitLab

If your code is on GitHub, you can either:
- **Option A**: Push directly to GitLab as the primary remote
- **Option B**: Use GitLab's repository mirroring feature

To add GitLab as a remote:
```bash
git remote add gitlab https://gitlab.com/YOUR_USERNAME/driverhire.git
git push gitlab main
```

### Step 2: Generate SSH Key for Deployment

On your local machine:
```bash
ssh-keygen -t ed25519 -C "gitlab-deploy" -f ~/.ssh/gitlab_deploy_key
```

This creates two files:
- `~/.ssh/gitlab_deploy_key` (private key - for GitLab)
- `~/.ssh/gitlab_deploy_key.pub` (public key - for VPS)

### Step 3: Add Public Key to VPS

Copy the public key to your VPS:
```bash
ssh-copy-id -i ~/.ssh/gitlab_deploy_key.pub deploy@YOUR_VPS_IP
```

Or manually add to `~/.ssh/authorized_keys` on the VPS.

### Step 4: Configure GitLab CI/CD Variables

Go to your GitLab project → **Settings** → **CI/CD** → **Variables**

Add these variables:

| Variable | Type | Value | Protected | Masked |
|----------|------|-------|-----------|--------|
| `SSH_PRIVATE_KEY` | Variable | Contents of `~/.ssh/gitlab_deploy_key` | Yes | Yes |
| `SSH_USER` | Variable | `deploy` | Yes | No |
| `VPS_HOST` | Variable | Your VPS IP (e.g., `45.13.132.210`) | Yes | No |
| `APP_PATH` | Variable | `/var/www/driverhire` | Yes | No |

**To get the private key content:**
```bash
cat ~/.ssh/gitlab_deploy_key
```

Copy everything including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`.

### Step 5: Enable GitLab Runner

GitLab.com provides shared runners by default. To verify:
1. Go to **Settings** → **CI/CD** → **Runners**
2. Ensure "Enable shared runners for this project" is ON

## Running the Pipeline

### Automatic Triggers
- **Push to main**: Runs test and build stages
- **Merge request**: Runs test stage only

### Manual Deployment
1. Go to **CI/CD** → **Pipelines**
2. Find the latest pipeline on `main`
3. Click the ▶️ play button on the `deploy:production` job

### Deploy from Command Line
```bash
# Trigger deployment via API
curl -X POST \
  -F "token=YOUR_TRIGGER_TOKEN" \
  -F "ref=main" \
  https://gitlab.com/api/v4/projects/YOUR_PROJECT_ID/trigger/pipeline
```

## Manual Deployment (Without GitLab)

You can also run the deployment script directly on the VPS:

```bash
ssh deploy@YOUR_VPS_IP
cd /var/www/driverhire
./deploy.sh main
```

## PM2 Process Management

### Useful Commands
```bash
# View status
pm2 status

# View logs
pm2 logs driverhire-backend

# Restart application
pm2 restart driverhire-backend

# Stop application
pm2 stop driverhire-backend

# Monitor resources
pm2 monit

# Save current process list (auto-start on reboot)
pm2 save
pm2 startup
```

## Troubleshooting

### SSH Connection Issues
```bash
# Test SSH connection manually
ssh -i ~/.ssh/gitlab_deploy_key deploy@YOUR_VPS_IP

# Check SSH key permissions
chmod 600 ~/.ssh/gitlab_deploy_key
```

### Build Failures
```bash
# Check GitLab CI/CD logs for error details
# Common issues:
# - Missing dependencies: Run `npm ci` locally to verify
# - Node version mismatch: Check NODE_VERSION in .gitlab-ci.yml
```

### Deployment Failures
```bash
# On VPS, check PM2 logs
pm2 logs driverhire-backend --lines 50

# Check if backend is running
pm2 status

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t
```

### Database Connection Issues
```bash
# Check MongoDB is running
sudo systemctl status mongod

# Test connection
mongosh mongodb://127.0.0.1:27017
```

## Security Best Practices

1. **Use Protected Variables**: Mark sensitive variables as "Protected" in GitLab
2. **Limit SSH Key Permissions**: The deploy key should only have access needed for deployment
3. **Use Deploy Keys**: Consider using GitLab Deploy Keys instead of personal SSH keys
4. **Restrict Branch Access**: Protect the `main` branch in GitLab settings
5. **Review Pipeline Logs**: Regularly check for any unusual activity

## Pipeline Configuration Reference

The pipeline is defined in `.gitlab-ci.yml` at the project root.

### Stages
- `test`: Runs linting and syntax checks
- `build`: Compiles frontend assets
- `deploy`: Deploys to production VPS

### Caching
Node modules are cached between jobs to speed up builds.

### Artifacts
Frontend build (`dist/`) is passed from build stage to deploy stage.

## Enabling Automatic Deployments

To deploy automatically on every push to `main`, edit `.gitlab-ci.yml`:

```yaml
deploy:production:
  # ... other config ...
  when: on_success  # Change from 'manual' to 'on_success'
```

⚠️ **Warning**: Only enable auto-deploy if you have comprehensive tests to catch issues before they reach production.

## Support

For issues with:
- **GitLab CI/CD**: Check GitLab documentation at https://docs.gitlab.com/ee/ci/
- **PM2**: Check PM2 documentation at https://pm2.keymetrics.io/docs/
- **This Project**: Review pipeline logs and VPS server logs

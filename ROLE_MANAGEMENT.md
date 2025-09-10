# Role Management Guide

This guide explains how to manage user roles for the Stock Ticker Remote Control Panel with Clerk authentication.

## Role Types

### 1. **Admin** (`admin`)
- Full access to all features
- Can add, edit, and **delete** stocks
- Can modify system controls (pause/resume, update intervals, currency)
- Can restart the API server
- Access to bulk price update operations

### 2. **Controller** (`controller`)
- Can add and edit stocks (but cannot delete)
- Can modify system controls
- Can perform bulk price updates
- Cannot restart the server

### 3. **User** (`user`) - Default
- Read-only access to stocks and system status
- Can view the remote control panel but cannot make changes
- Default role for all new users

## Development Mode

In **development mode** (`NODE_ENV=development`), all authenticated users are automatically granted **admin** access for easier testing and development.

## Production Role Assignment

For production environments, you must explicitly assign roles to users using one of the following methods:

### Method 1: Using the Management Script (Recommended)

Use the provided script to manage user roles:

```bash
# List all users and their current roles
node scripts/manage-clerk-users.cjs list

# Set a user as admin
node scripts/manage-clerk-users.cjs set-admin john@example.com

# Set a custom role
node scripts/manage-clerk-users.cjs set-role john@example.com controller

# Remove role (revert to default 'user')
node scripts/manage-clerk-users.cjs remove-role john@example.com
```

### Method 2: Using Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to your application
3. Go to "Users" section
4. Click on a user
5. In the "Public metadata" section, add:
   ```json
   {
     "role": "admin"
   }
   ```

### Method 3: Using Email Domain (Automatic)

The system automatically grants admin access to users whose email addresses contain "admin" (e.g., `admin@company.com`).

## Role Assignment Logic

The server checks roles in this order:

1. **Public Metadata**: Check `user.publicMetadata.role`
2. **Email Domain**: Check if email contains "admin"
3. **Development Mode**: Grant admin if `NODE_ENV=development`
4. **Default**: Assign "user" role

## Troubleshooting

### "Insufficient permissions" error

If you're getting permission errors:

1. **Check your current role**:
   ```bash
   # Check what role the system sees for your user
   node scripts/manage-clerk-users.cjs list
   ```

2. **Verify development mode** (for local testing):
   - Ensure `NODE_ENV=development` in your environment
   - Restart the server after making changes

3. **Assign proper role**:
   ```bash
   # Set yourself as admin
   node scripts/manage-clerk-users.cjs set-admin your-email@example.com
   ```

4. **Wait for propagation**: Role changes may take 1-2 minutes to propagate.

### Role not updating in the app

1. **Sign out and sign back in** to refresh your session
2. **Check server logs** for any authentication errors
3. **Verify the role in Clerk Dashboard** under user's public metadata

## Security Notes

- **Never hardcode admin credentials** in your application
- **Use environment-specific role assignment**: Development can be permissive, production should be strict
- **Regularly audit user roles** using the list command
- **Implement proper logging** for admin actions

## API Endpoints and Required Roles

| Endpoint | Method | Required Role | Description |
|----------|---------|---------------|-------------|
| `/api/remote/stocks` | GET | None | View stocks (public) |
| `/api/remote/stocks` | POST | controller/admin | Add new stock |
| `/api/remote/stocks/:symbol` | PUT | controller/admin | Update stock price |
| `/api/remote/stocks/bulk` | PUT | controller/admin | Bulk price update |
| `/api/remote/stocks/:symbol` | DELETE | **admin** | Delete stock |
| `/api/remote/controls` | GET | None | View system controls |
| `/api/remote/controls` | PUT | controller/admin | Update system controls |
| `/api/remote/restart` | POST | **admin** | Restart API server |
| `/api/remote/user` | GET | Any authenticated | Get current user info |

## Example Workflows

### Setting up a new admin user

```bash
# 1. List current users
node scripts/manage-clerk-users.cjs list

# 2. Find the user you want to promote
# 3. Set them as admin
node scripts/manage-clerk-users.cjs set-admin jane@company.com

# 4. Verify the change
node scripts/manage-clerk-users.cjs list
```

### Bulk role assignment for a team

```bash
# Set multiple team members as controllers
node scripts/manage-clerk-users.cjs set-role alice@team.com controller
node scripts/manage-clerk-users.cjs set-role bob@team.com controller
node scripts/manage-clerk-users.cjs set-role charlie@team.com controller

# Set team lead as admin
node scripts/manage-clerk-users.cjs set-admin teamlead@team.com
```

### Production deployment checklist

- [ ] Remove or disable development mode auto-admin
- [ ] Assign proper roles to production users
- [ ] Test role restrictions work correctly
- [ ] Document who has admin access
- [ ] Set up monitoring for admin actions

---

For more help, see the main [CLERK_SETUP.md](./CLERK_SETUP.md) file or check the [Clerk documentation](https://clerk.com/docs).

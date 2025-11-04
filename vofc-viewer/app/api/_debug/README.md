# Debug Routes

This directory contains all debug/development API routes that are not used in production.

## Routes Moved Here:

- `debug-auth/` - Authentication debugging
- `debug-cookies/` - Cookie debugging
- `debug-login/` - Login debugging
- `debug-ofcs/` - OFC debugging
- `debug-user/` - User debugging
- `debug-users/` - Users debugging

## Usage

These routes are prefixed with `_` to keep them at the bottom of directory listings and indicate they are not production routes.

To access these routes, update the path from `/api/debug-*` to `/api/_debug/debug-*`.


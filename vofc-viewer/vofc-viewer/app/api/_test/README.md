# Test Routes

This directory contains all test/utility API routes used for testing and development.

## Routes Moved Here:

- `test-db/` - Database testing
- `test-env/` - Environment variable testing
- `test-frosty/` - Frosty-specific tests
- `test-function/` - Function testing
- `test-simple/` - Simple tests
- `test-status/` - Status testing
- `test-storage/` - Storage testing

## Usage

These routes are prefixed with `_` to keep them at the bottom of directory listings and indicate they are not production routes.

To access these routes, update the path from `/api/test-*` to `/api/_test/test-*`.


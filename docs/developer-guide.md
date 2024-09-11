# Developer Guide

## Prerequisite

You need to have [`git`](https://git-scm.com/) and [`nodejs`](https://nodejs.org) installed and available in your terminal.

## Set up the development environment

To set up a development environment for Rail Map Painter, follow these steps:

1. Clone this repository:

    ```bash
    git clone https://github.com/railmapgen/rmp.git
    ```

2. Navigate to the project folder:

    ```bash
    cd rmp
    ```

3. Install dependencies:

    ```bash
    npm install
    ```

4. Start the development server:

    ```bash
    npm run dev
    ```

    This will open the application in your default web browser, and it will automatically reload whenever you make changes to the source code.

## Rename your local branches

Branches are renamed in v5 release. The previous `main` has been renamed to `v3`, and `v5` is now `main`. If you have a local copy, you can update it using the instructions below.

```
git fetch origin

git branch -m main v3   # If you had a local `main`
git branch -m v5 main   # If you had a local `v5`

git branch --set-upstream-to=origin/v3 v3
git branch --set-upstream-to=origin/main main

git remote prune origin

git checkout main   # Switch to the new `main` branch
```

We understand that renaming default branches is uncommon and may cause some inconvenience for developers. Rest assured, this will be the last time we make such changes. :)

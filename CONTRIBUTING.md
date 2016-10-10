Contributing to Join Monster
========================

All active development of Join Monster happens on GitHub. We actively welcome and appreciate your [pull requests](https://help.github.com/articles/creating-a-pull-request)!

## Issues

Bugs and feature requests are tracked via GitHub issues. Make sure bug descriptions are clear and detailed, with versions and stack traces. Provide your code snippets if any.


## Pull Requests

Begin by forking our repository and cloning your fork. Once inside the directory, run `npm install`. Check the `scripts` in the `package.json` for easily running the example data and the demo server with GraphiQL. Now you can begin coding.

Before commiting your changes, **run the lint, tests, and coverage to make sure everything is green.** After making your commits, push it up to your fork and make a pull request to our master branch. We will review it ASAP.

## Release on NPM

We will make timely releases with any new changes, so you do not need to worry about publishing. But if you desperately want your changes in the NPM repository, you can trigger a new release. Tagged commits to the master branch will trigger a new build on NPM. Before pushing your commits, run `npm version patch|minor|major` to bump the version and automatically tag the commit. Then `git push --follow-tags` and make your pull request. Travis-CI will publish the package. Do not publish manually form the command line.

## License

By contributing to Join Monster, you agree that your contributions will be licensed under the LICENSE file in the project root directory.

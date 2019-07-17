# Moar CLI

Module Mangement *and moar!*

# Overview

The **Moar CLI** tool manages multi-module builds without using traditional [Git Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules).

With traditional [Git Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules) every application that uses a module has it's own seperate copy.

With **Moar CLI**, multi-module builds are managed using modules that exist at the top level and are linked to consumers via [symbolic links](https://en.wikipedia.org/wiki/Ln_(Unix)).  This provides a benefit when mulitple modules use the same source module.  The typical use case is when several micro services use various library modules.  With the symbolic link approach developers only need to manage one copy of each library module regardless of how many applications are using the module.

A developer with two libraries used by six applications the [Git Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules) must manage eighteen repositories on their workstations.  Keepoing all the modules in sync with pulls and pushes can be quite a chore.  Using **Moar CLI** the environment is managed with only the eight top level modules.

# Install

```bash
npm install -g moar-cli
```

If your system does not have Java 11 as the global default, you can define an environment variable of `MOAR_JAVA_HOME` pointing to a Java 11 environment for the `moar` command without altering your global Java setup.

# Accessing Help

Help for the main `moar` is available from the tool.

```bash
moar --help
```

Help for the legacy `moar-j` client is also via the tool.

The java version will be deprecated in a future release.

```bash
moar-j --help
```

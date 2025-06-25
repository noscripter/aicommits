<div align="center">
  <div>
    <img src=".github/screenshot.png" alt="AI Commits"/>
    <h1 align="center">AI Commits</h1>
  </div>
	<p>A CLI that writes your git commit messages for you with AI. Never write a commit message again.</p>
	<a href="https://www.npmjs.com/package/aicommits"><img src="https://img.shields.io/npm/v/aicommits" alt="Current version"></a>
</div>

---

## Setup

> The minimum supported version of Node.js is the latest v14. Check your Node.js version with `node --version`.


1. Install _aicommits_:

    ```sh
    npm install -g aicommits
    ```

2. Retrieve your API key from [OpenAI](https://platform.openai.com/account/api-keys)

    > Note: If you haven't already, you'll have to create an account and set up billing.

3. Set the key so aicommits can use it:

    ```sh
    aicommits config set OPENAI_KEY=<your token>
    ```

    This will create a `.aicommits` file in your home directory.


### Upgrading

Check the installed version with:
```
aicommits --version
```

If it's not the [latest version](https://github.com/Nutlope/aicommits/releases/latest), run:

```sh
npm update -g aicommits
```

## Usage

### CLI mode

You can call `aicommits` directly to generate a commit message for your staged changes:

```sh
git add <files...>
aicommits
```

`aicommits` passes down unknown flags to `git commit`, so you can pass in [`commit` flags](https://git-scm.com/docs/git-commit).

> 👉 **Tip:** Use the `aic` alias if `aicommits` is too long for you.

#### Basic Examples

```sh
# Generate a commit message for staged changes
git add .
aicommits

# Stage all changes and generate commit message
aicommits --all # or -a

# Generate multiple options to choose from
aicommits --generate 3 # or -g 3

# Use conventional commit format
aicommits --type conventional # or -t conventional

# Auto-accept the first generated message (skip confirmation)
aicommits --yes # or -y

# Combine flags
aicommits --all --generate 2 --type conventional --yes
```

#### Advanced Examples

```sh
# Exclude specific files from AI analysis
aicommits --exclude package-lock.json --exclude "*.log"

# Use a different commit type for this commit only
aicommits --type conventional

# Generate 5 options with conventional commits
aicommits --generate 5 --type conventional

# Pass additional git commit flags
aicommits --author="John Doe <john@example.com>"
aicommits --no-verify  # Skip git hooks

# Use in CI/CD pipelines (auto-accept + all files)
aicommits --all --yes
```

#### Generate multiple recommendations

Sometimes the recommended commit message isn't the best so you want it to generate a few to pick from. You can generate multiple commit messages at once by passing in the `--generate <i>` flag, where 'i' is the number of generated messages:
```sh
aicommits --generate <i> # or -g <i>
```

> Warning: this uses more tokens, meaning it costs more.

#### Commit Types

Aicommits supports different commit message formats:

**Default format:** Simple, descriptive commit messages
```sh
aicommits
# Example output: "Add user authentication feature"
```

**Conventional commits:** Follows the [Conventional Commits](https://www.conventionalcommits.org/) specification
```sh
aicommits --type conventional
# Example output: "feat(auth): add user authentication feature"
```

Available conventional commit types:
- `feat`: A new feature
- `fix`: A bug fix  
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Git hook

You can also integrate _aicommits_ with Git via the [`prepare-commit-msg`](https://git-scm.com/docs/githooks#_prepare_commit_msg) hook. This lets you use Git like you normally would, and edit the commit message before committing.

#### Install

In the Git repository you want to install the hook in:
```sh
aicommits hook install
```

#### Uninstall
In the Git repository you want to uninstall the hook from:

```sh
aicommits hook uninstall
```

#### Usage

1. Stage your files and commit:
    ```sh
    git add <files...>
    git commit # Only generates a message when it's not passed in
    ```

    > If you ever want to write your own message instead of generating one, you can simply pass one in: `git commit -m "My message"`

2. Aicommits will generate the commit message for you and pass it back to Git. Git will open it with the [configured editor](https://docs.github.com/en/get-started/getting-started-with-git/associating-text-editors-with-git) for you to review/edit it.

3. Save and close the editor to commit!

## Configuration

### Reading a configuration value
To retrieve a configuration option, use the command:

```sh
aicommits config get <key>
```

For example, to retrieve the API key, you can use:
```sh
aicommits config get OPENAI_KEY
```

You can also retrieve multiple configuration options at once by separating them with spaces:

```sh
aicommits config get OPENAI_KEY generate locale type
```

### Setting a configuration value

To set a configuration option, use the command:

```sh
aicommits config set <key>=<value>
```

For example, to set the API key, you can use:

```sh
aicommits config set OPENAI_KEY=<your-api-key>
```

You can also set multiple configuration options at once by separating them with spaces:

```sh
aicommits config set OPENAI_KEY=<your-api-key> generate=3 locale=en type=conventional
```

### Configuration Examples

```sh
# Basic setup
aicommits config set OPENAI_KEY=sk-...

# Conventional commits with Japanese locale
aicommits config set type=conventional locale=ja

# Generate 3 options by default with longer messages
aicommits config set generate=3 max-length=100

# Configure for team use with specific model and timeout
aicommits config set model=gpt-4 timeout=15000 max-length=72

# Auto-accept commits (useful for automation)
aicommits config set auto-accept=true

# Full configuration example
aicommits config set \
  OPENAI_KEY=sk-... \
  type=conventional \
  locale=en \
  generate=2 \
  max-length=72 \
  model=gpt-3.5-turbo \
  timeout=10000
```

### Configuration Options

#### OPENAI_KEY

Required

The OpenAI API key. You can retrieve it from [OpenAI API Keys page](https://platform.openai.com/account/api-keys).

```sh
aicommits config set OPENAI_KEY=sk-...
```

#### type

Default: `""` (empty - regular commit messages)

The type of commit message to generate. Available options:
- `""` (empty): Regular descriptive commit messages
- `conventional`: Follows the Conventional Commits specification

```sh
# Use conventional commits
aicommits config set type=conventional

# Use regular commit messages
aicommits config set type=""
```

#### locale

Default: `en`

The locale to use for the generated commit messages. Consult the list of codes in: https://wikipedia.org/wiki/List_of_ISO_639-1_codes.

```sh
# Japanese commit messages
aicommits config set locale=ja

# Spanish commit messages  
aicommits config set locale=es

# German commit messages
aicommits config set locale=de
```

#### generate

Default: `1`

The number of commit messages to generate to pick from.

Note, this will use more tokens as it generates more results.

```sh
# Generate 3 options to choose from
aicommits config set generate=3

# Always generate 5 options (maximum)
aicommits config set generate=5
```

#### max-length

Default: `50`

The maximum character length of the generated commit message.

```sh
# Longer commit messages
aicommits config set max-length=100

# Shorter commit messages
aicommits config set max-length=30

# Standard Git recommendation
aicommits config set max-length=72
```

#### model

Default: `gpt-3.5-turbo`

The Chat Completions (`/v1/chat/completions`) model to use. Consult the list of models available in the [OpenAI Documentation](https://platform.openai.com/docs/models/model-endpoint-compatibility).

```sh
# Use GPT-4 for better analysis (higher cost)
aicommits config set model=gpt-4

# Use GPT-3.5 Turbo (default, cost-effective)
aicommits config set model=gpt-3.5-turbo

# Use GPT-4 Turbo (newer model)
aicommits config set model=gpt-4-1106-preview
```

> Tip: If you have access, try upgrading to [`gpt-4`](https://platform.openai.com/docs/models/gpt-4) for next-level code analysis. It can handle double the input size, but comes at a higher cost. Check out OpenAI's website to learn more.

#### timeout

Default: `10000` (10 seconds)

The timeout for network requests to the OpenAI API in milliseconds.

```sh
# 20 second timeout
aicommits config set timeout=20000

# 5 second timeout  
aicommits config set timeout=5000
```

#### auto-accept

Default: `false`

Automatically accept the first generated commit message without prompting for confirmation. Useful for automation and CI/CD pipelines.

```sh
# Enable auto-accept
aicommits config set auto-accept=true

# Disable auto-accept (default)
aicommits config set auto-accept=false
```

#### proxy

Set a HTTP/HTTPS proxy to use for requests.

```sh
# Set proxy
aicommits config set proxy=http://proxy.company.com:8080

# Set proxy with authentication
aicommits config set proxy=http://user:pass@proxy.company.com:8080

# Clear proxy (note the empty value)
aicommits config set proxy=
```

### CLI Flags Reference

All configuration options can be overridden using CLI flags:

| Config Option | CLI Flag | Short | Example |
|---------------|----------|-------|---------|
| generate | `--generate` | `-g` | `aicommits -g 3` |
| type | `--type` | `-t` | `aicommits -t conventional` |
| N/A | `--exclude` | `-x` | `aicommits -x "*.log"` |
| N/A | `--all` | `-a` | `aicommits -a` |
| auto-accept | `--yes` | `-y` | `aicommits -y` |

### Common Configuration Scenarios

#### For Individual Developers
```sh
# Basic setup with conventional commits
aicommits config set OPENAI_KEY=sk-... type=conventional max-length=72
```

#### For Teams
```sh
# Consistent format across team
aicommits config set type=conventional locale=en max-length=72 generate=1
```

#### For CI/CD Pipelines
```sh
# Automated commits without prompts
aicommits config set auto-accept=true type=conventional timeout=30000
```

#### For Non-English Teams
```sh
# Japanese team with conventional commits
aicommits config set locale=ja type=conventional max-length=100
```

## How it works

This CLI tool runs `git diff` to grab all your latest code changes, sends them to OpenAI's GPT-3, then returns the AI generated commit message.

Video coming soon where I rebuild it from scratch to show you how to easily build your own CLI tools powered by AI.

## Maintainers

- **Hassan El Mghari**: [@Nutlope](https://github.com/Nutlope) [<img src="https://img.shields.io/twitter/follow/nutlope?style=flat&label=nutlope&logo=twitter&color=0bf&logoColor=fff" align="center">](https://twitter.com/nutlope)


- **Hiroki Osame**: [@privatenumber](https://github.com/privatenumber) [<img src="https://img.shields.io/twitter/follow/privatenumbr?style=flat&label=privatenumbr&logo=twitter&color=0bf&logoColor=fff" align="center">](https://twitter.com/privatenumbr)


## Contributing

If you want to help fix a bug or implement a feature in [Issues](https://github.com/Nutlope/aicommits/issues), checkout the [Contribution Guide](CONTRIBUTING.md) to learn how to setup and test the project.

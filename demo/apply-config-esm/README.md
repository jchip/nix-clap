# NixClap applyConfig ESM Demo

This demo showcases the `applyConfig` feature of NixClap, which allows you to apply configuration from external sources (like config files, environment variables, or package.json) after CLI parsing.

## Configuration Hierarchy

The `applyConfig` method implements a configuration hierarchy where:

1. **CLI arguments** have the highest priority (source: "cli")
2. **User config** has medium priority (source: "user")
3. **Defaults** have the lowest priority (source: "default")

## Running the Demo

```bash
# Install dependencies
npm install

# Run with default config (no CLI args)
npm start

# Run with some CLI overrides
node apply-config.js --verbose --timeout 2000

# Run with output file specified
node apply-config.js --output /tmp/custom.log

# Run with TypeScript (development)
npm run dev
```

## Example Output

When run without CLI arguments, you'll see:

```
Final configuration:
===================
Verbose: false
Timeout: 10000ms
Retries: 5
Output: /tmp/default.log

Configuration sources:
=====================
Verbose source: default
Timeout source: user
Retries source: user
Output source: user
```

When run with `--verbose --timeout 2000`:

```
Final configuration:
===================
Verbose: true
Timeout: 2000ms
Retries: 5
Output: /tmp/default.log

Configuration sources:
=====================
Verbose source: cli
Timeout source: cli
Retries source: user
Output source: user
```

## How it Works

1. **CLI Parsing**: NixClap parses the command-line arguments first
2. **Config Application**: User config is applied using `applyConfig()`
3. **Precedence**: CLI arguments override user config, which overrides defaults
4. **Source Tracking**: Each option tracks its source for debugging

This pattern is useful for:

- Loading config from `.rc` files
- Reading settings from `package.json`
- Applying environment variable configurations
- Merging multiple config sources with proper precedence

# discv5-cli

CLI wrapper around [`@chainsafe/discv5`](https://github.com/chainsafe/discv5)

## Usage

`discv5 --help` - Help text

`discv5 init` - Initializes new PeerId and ENR in local directory

`discv5 [run]` - Runs Discv5 service

Note: A UDP Multiaddr, PeerId, Local ENR, Bootstrap ENRs, and Output ENRs files must be provided to run the Discv5 service.

## Logging

Additional logs may be configured with the `DEBUG` environment variable.

eg: `DEBUG=discv5* discv5`

## License

Apache 2.0

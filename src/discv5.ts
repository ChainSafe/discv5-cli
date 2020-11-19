import process = require("process");
import debug = require("debug");
import randomBytes = require("randombytes");
import {
  ENR,
  Discv5,
  toHex,
} from "@chainsafe/discv5";
import {
  getBindAddress,
  readPeerId, readEnr, readEnrs,
  writePeerId, writeEnr, writeEnrs,
} from "./util";

exports.command = ["$0", "run"];

exports.describe = "Run Discv5 Service";

exports.builder = {
  "p": {
    alias: "peer-id-file",
    demandOption: true,
    default: "./peer-id.json",
    describe: "PeerId file",
    type: "string",
  },
  "e": {
    alias: "local-enr-file",
    default: "./local-enr",
    describe: "Local ENR file",
    type: "string",
  },
  "b": {
    alias: "bootstrap-enrs-file",
    demandOption: true,
    default: "./bootstrap-enrs",
    describe: "Bootstrap ENRs file, line delimited",
    type: "string"
  },
  "a": {
    alias: "bind-address",
    default: "/ip4/0.0.0.0/udp/5500",
    describe: "Multiaddr of the bind address (Must use UDP transport)",
    type: "string"
  },
  "o": {
    alias: "output-enrs-file",
    demandOption: true,
    default: "./output-enrs",
    describe: "Output ENRs file, line delimited",
    type: "string",
  }
};

interface IInput {
  p: string;
  e: string;
  b: string;
  a: string;
  o: string;
}

exports.handler = function(argv: IInput): void {
  process.on("SIGTERM", () => stop(argv.p, argv.e, argv.o));
  process.on("SIGINT", () => stop(argv.p, argv.e, argv.o));
  process.on("SIGHUP", () => save(argv.p, argv.e, argv.o));
  init(argv.p, argv.e, argv.b, argv.a).then(() => start());
};

const log = debug("discv5:cli");
log.enabled = true;
let discv5: Discv5;
const foundEnrs: Record<string, ENR> = {};

async function init(
  peerIdFile: string,
  enrFile: string,
  bootstrapEnrsFile: string,
  bindAddressString: string,
): Promise<void> {
  const peerId = await readPeerId(peerIdFile);
  const localEnr = readEnr(enrFile);
  const bootstrapEnrs = readEnrs(bootstrapEnrsFile);
  const bindAddress = getBindAddress(bindAddressString);

  discv5 = Discv5.create({enr: localEnr, peerId, multiaddr: bindAddress});
  bootstrapEnrs.forEach((enr) => {
    log("Adding bootstrap enr: %s", enr.encodeTxt());
    discv5.addEnr(enr);
  });
}

async function start(): Promise<void> {
  await discv5.start();
  log("Service started on %s with local node id: %s", discv5.bindAddress, discv5.enr.nodeId);

  while (discv5.isStarted()) {
    const nodeId = toHex(randomBytes(32));
    log("Find node: %s", nodeId);
    const nearest = await discv5.findNode(nodeId);
    if (discv5.isStarted()) {
      nearest.forEach((enr) => foundEnrs[enr.nodeId] = enr);
      log("%d total enrs in the table", discv5.kadValues().length);
      log("%d total connected peers", discv5.connectedPeerCount);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function save(
  peerIdFile: string,
  enrFile: string,
  outputFile: string,
): Promise<void> {
  const peerId = await discv5.peerId();
  writePeerId(peerIdFile, peerId);
  writeEnr(enrFile, discv5.enr, peerId);
  writeEnrs(outputFile, Object.values(foundEnrs));
}

async function stop(
  peerIdFile: string,
  enrFile: string,
  outputFile: string,
): Promise<void> {
  await save(peerIdFile, enrFile, outputFile);
  await discv5.stop();
  log("Service stopped");
  process.exit(0);
}


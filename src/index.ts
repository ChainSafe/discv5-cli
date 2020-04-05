import yargs = require("yargs");

yargs
  .command(require("./discv5"))
  .command(require("./init"))
  .help()
  .argv;

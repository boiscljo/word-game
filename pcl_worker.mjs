import { WordsOnStream } from "./wos.mjs"
import  { workerData, parentPort }  from "worker_threads";

var begin = workerData.begin
var end = workerData.end
let game = new WordsOnStream()

console.log("Starting worker thread");
await game.init()

await game.worker(begin,end);

console.log("Ending worker thread");

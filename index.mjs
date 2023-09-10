import { LiveChat } from "youtube-chat"
import { WordsOnStream } from "./wos.mjs"
import fs from 'fs/promises'
const readline = (await import('readline/promises')).default;
const express = (await import('express')).default;
const app = express()
let game = new WordsOnStream()


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// GET method route
app.get('/', async (req, res) => {
    res.send((await fs.readFile("game.html")).toString());
    res.end();
})
// GET method route
app.get('/state', (req, res) => {
    res.send(JSON.stringify({
        letters: game.current_letters,
        words: game.current_words,
        leaderboard: game.leaderboard,
        time_remaining: game.time_remaining,
        game_duration:game.game_duration,
        state: game.state

    }))
    res.end();
})
console.log("game.init")
await game.init()

console.log("game.createCandidateList")
//await game.createCandidateList();

console.log("game.begin")
await game.begin(240)

// await game.message("user1", game.current_words[0].word)
// await game.message("user2", game.current_words[1].word)
// await game.message("user3", game.current_words[2].word)

app.listen(8000)

// Or specify LiveID in Stream manually.
const liveChat = new LiveChat({ channelId: "UCQ8fO2UsIWT4UMBRoQkqmJQ" })// liveId: "TL1PKy5NzSs" 

// Emit at start of observation chat.
// liveId: string
liveChat.on("start", (liveId) => {
    /* Your code here! */
})

// Emit at end of observation chat.
// reason: string?
liveChat.on("end", (reason) => {
    /* Your code here! */
})

function pushNoise() {

}

var begun = false;
// Emit at receive chat.
// chat: ChatItem
liveChat.on("chat", (chatItem) => {
    /* Your code here! */
    chatItem.message.forEach(async msg => {
        if (msg.text) {
            if (begun) {
                if (await game.message(chatItem.author.name, msg.text.trim())) {
                    pushNoise();
                }
            }
        }
    })
})

// Start fetch loop
const ok = await liveChat.start()
if (!ok) {
    console.log("Failed to start, check emitted error")
}
setTimeout(() => {
    begun = true;
}, 1000);

rl.on("line", async (msg) => {
    if (msg.includes("!restart")) {
        await game.begin();
    }
    if (await game.message("Console", msg)) {
        pushNoise();
        console.log("Found");
    }
    console.log(game.leaderboard);
})
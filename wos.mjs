
import fs from 'fs/promises'
const { Worker } = (await import("worker_threads")).default;
function shuffleStr (word) {
    var a = word.split(""),
        n = a.length;

    for(var i = n - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a.join("");
}
export class Word {
    constructor(word) {
        this.word = word;
        this.author = null;
        const newAlphabet = { a: 1, e: 1, i: 1, o: 1, u: 1, l: 1, n: 1, r: 1, s: 1, t: 1, d: 2, g: 2, b: 3, c: 3, m: 3, p: 3, f: 4, h: 4, v: 4, w: 4, y: 4, k: 5, j: 8, x: 8, q: 10, z: 10, };
        const scrabbleScore = word => word.split('').map(letter => newAlphabet[letter]).reduce((a, b) => a + b);
        this.points = scrabbleScore(word);
    }
}
export class Leaderboard {
    constructor() {
        this.scores = {};
    }

    clear() {
        this.scores = {};
    }

    add(author, score) {
        this.scores[author] = (this.scores[author] || 0) + score;
    }

    sorted() {
        let elements = Object.keys(this.scores).map(key, [key, this.scores[key]]);
        console.log(elements);
    }
}
export class WordsOnStream {
    constructor() {
        this.words = [];
        this.invalid_candidates = [];
        this.candidates = [];
        this.current_letters = "null";
        this.current_words = [new Word("null")];
        this.leaderboard = new Leaderboard();
        this.time_remaining = 0;
        this.state="game";
    }
    async init() {
        try {
            let file_content = fs.readFile("words_alpha.txt");
            let text = (await file_content).toString();
            let words = text.split('\r').map(word => word.trim()).filter(word => word.length >= 3);
            this.words = words;
        } catch {

        }
        try {
            let file_content = fs.readFile("candidates.txt");
            let text = (await file_content).toString();
            let words = text.split('\r').map(word => word.trim()).filter(word => word.length >= 3);
            this.candidates = words;
        } catch {

        }
        try {
            let file_content = fs.readFile("not_candidates.txt");
            let text = (await file_content).toString();
            let words = text.split('\r').map(word => word.trim()).filter(word => word.length >= 3);
            this.invalid_candidates = words;
        } catch {

        }
        this.dict = {}
        this.words.forEach(d => {
            this.dict[d] = d;
        })
        this.dict_candidates = {}
        this.candidates.forEach(d => {
            this.dict_candidates[d] = d;
        })
        this.dict_not_candidates = {}
        this.invalid_candidates.forEach(d => {
            this.dict_not_candidates[d] = d;
        })
        this.interval = setInterval(() => {
            this.time_remaining -= 0.1;
            if (parseInt(this.time_remaining/10) !=parseInt((this.time_remaining+0.1)/10))
            {
                this.current_letters= shuffleStr(this.current_letters)
            }
            if (this.time_remaining <= -10) {
                this.begin(this.game_duration);
            }
            else if (this.time_remaining <= 0) {
                this.state = "leaderboard";
            }
        }, 100);
    }
    permutation(start, string) {

        //base case
        if (string.length == 1) {
            return [start + string];
        } else {

            var returnResult = [];
            for (var i = 0; i < string.length; i++) {
                var result = this.permutation(string[i], string.substr(0, i) + string.substr(i + 1));
                for (var j = 0; j < result.length; j++) {
                    returnResult.push(start + result[j]);
                }
            }

            return returnResult;
        }
    }
    /**
     * 
     * @param {string} word 
     * @returns string[]
     */
    anagrams(word) {
        return Array.from(new Set(this.permutation('', word)));
    }
    ganagrams(word) {
        let ana = this.anagrams(word);
        ana = ana.flatMap(word => {
            var a = [];
            for (var i = 4; i <= word.length; i++) {
                a.push(word.substr(0, i));
            }
            return a;
        })
        return Array.from(new Set(ana));
    }
    valid_anagrams(word) {
        return this.anagrams(word).filter(d => this.dict[d]);
    }
    valid_ganagrams(word) {
        return this.ganagrams(word).filter(d => this.dict[d]);
    }
    async addCandidate(candidate)
    {
        if (this.dict_candidates[candidate])return;
        console.log("adding",candidate,"to candidate list")
        this.candidates.push(candidate);
        this.dict_candidates[candidate]=candidate;
        await fs.appendFile("candidates.txt",("\r\n")+candidate);
    }
    async invalidCandidate(candidate)
    {
        console.log("removing",candidate,"from candidate list")
        this.invalid_candidates.push(candidate);
        this.dict_not_candidates[candidate]=candidate;
        await fs.appendFile("not_candidates.txt",("\r\n")+candidate);
    }
    async begin(duration=240) {
        var selectedWord = null;
        this.state = "game";
        this.game_duration = duration;
        this.time_remaining = duration;
        var candidates = this.candidates.filter(word => word.length >= 5 && word.length <= 10);
        /* Randomize array in-place using Durstenfeld shuffle algorithm */
        function shuffleArray(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
        }
        shuffleArray(candidates);
        var i = 0;
        while (!selectedWord) {
            var candidate = candidates[i++];
            if (!candidate) throw "Candidate isn't valid" + candidate;
            if (this.dict_not_candidates[candidate]) continue;
            var ganagrams = this.valid_ganagrams(candidate);
            if (ganagrams.length > 10 && ganagrams.length <= 40) {
                selectedWord = candidate;

                this.current_letters = candidate;
                this.current_words = ganagrams.filter((v, i) => i < 40).map(gan => new Word(gan));
            }
        }
    }

    async createCandidateList() {
        var selectedWord = null;
        this.time_remaining = this.game_duration;
        var candidates = this.words.filter(word => word.length >= 5 && word.length <= 10);
        
        function createWorker(begin,end) {
            return new Promise(function (resolve, reject) {
                const worker = new Worker("./pcl_worker.mjs", {
                    workerData: { begin: begin, end:end },
                });
                worker.on("message", (data) => {
                    console.log(data);
                });
                worker.on("close", (data) => {
                    console.log("done");
                });
                worker.on("error", (msg) => {
                    console.error(msg);
                    reject("error")
                });
            });
        }
        var promises=[]
        for(var i=0;i<candidates.length;i+=50000)
        {
            promises.push(createWorker(i,i+50000));
        }
        await Promise.all(promises);
    }
    async worker(begin,end)
    {
        var candidates = this.words.filter(word => word.length >= 5 && word.length <= 10);
        console.log("Evaluating, ",end-begin,"candidates")
        var i = begin;
        while (i<=end) {
            var candidate = candidates[i++];
            if (!candidate) break;
            if (this.dict_not_candidates[candidate]) continue;
            if (this.dict_candidates[candidate]) continue;
            var ganagrams = this.valid_ganagrams(candidate);
            if (ganagrams.length > 10 && ganagrams.length <= 40) {
                this.current_letters = candidate;
                this.current_words = ganagrams.filter((v, i) => i < 40).map(gan => new Word(gan));
                await this.addCandidate(candidate);
            }
            else{
                await this.invalidCandidate(candidate);
            }
        }
    }

    async message(author, content) {
        if (this.time_remaining <= 0) return false;
        let word = this.current_words.filter(element => element.word == content)[0];
        if (word) {
            if (word.author) return false;
            word.author = author;
            this.leaderboard.add(author, word.points);
            return true;
        }
        else return false;
    }

}
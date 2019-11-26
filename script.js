// Constants
const BOTH   = 0;
const BLACK  = 1;
const WHITE  = 2;
const REMOVE = 3;
const SIZE = 600;
const BOARD_SIZE = 9;
// SPACE
// 8 spaces internal to the board
// 2 padding spaces outside the board
// 9 grid lines on the playing field
const SPACE = SIZE / (BOARD_SIZE + 1);

// Global state
let state = {
    button_state: {
        color: BOTH, // BOTH / BLACK / WHITE
        remove: false
    },
    preview: [undefined, undefined, undefined]
};
let undo_index = 0;
let undo = []; // List of moves states. Each move is a tuple [r, c, BLACK/WHITE]

// PeerJS connection object: conn.send('hello');
let conn = undefined;
let connOpen = false;

function msg() {
    if (!connOpen) return;
    let data = {
        "button_state": getState().button_state,
        "undo_index": undo_index,
        "undo": undo
    };
    conn.send(JSON.stringify(data));
}

function getState() {
    return state;
}
function setState(new_state) {
    for (let prop in state) {
        if (Object.prototype.hasOwnProperty.call(state, prop)) {
            state[prop] = new_state[prop];
        }
    }
}
function copyState() {
    let new_state = {};
    for (let prop in state) {
        if (Object.prototype.hasOwnProperty.call(state, prop)) {
            new_state[prop] = JSON.parse(JSON.stringify(state[prop]));
        }
    }
    return new_state;
}

function clearStones() {
    d3.selectAll(".stone").remove();
}

function moves() {
    return undo[undo_index];
}

function render() {
    clearStones();

    let bStone = d3.select("svg").selectAll(".black.stone")
        .data(moves().filter(x => x[2] == BLACK))
        .enter().append("circle")
        .attr("class", "black stone")
        .attr("id", d => `"black-stone-${d[1]}-${d[0]}"`)
        .attr("cx", d => d[1] * SPACE)
        .attr("cy", d => d[0] * SPACE)
        .attr("r", SPACE/2);

    let wStone = d3.select("svg").selectAll(".white.stone")
        .data(moves().filter(x => x[2] == WHITE))
        .enter().append("circle")
        .attr("class", "white stone")
        .attr("id", d => `"white-stone-${d[1]}-${d[0]}"`)
        .attr("cx", d => d[1] * SPACE)
        .attr("cy", d => d[0] * SPACE)
        .attr("r", SPACE/2);

    // Preview stone
    if (state.preview[0] != undefined) {
        let className = (state.preview[2] == BLACK)? "black" : "white";
        if (state.preview[2] == REMOVE) {
            className = "remove";
        }
        let pStone = d3.select("svg").selectAll(".preview.stone" + "." + className)
            .data([state.preview])
            .enter().append("circle")
            .attr("class", "preview stone " + className)
            .attr("cx", d => d[1] * SPACE)
            .attr("cy", d => d[0] * SPACE)
            .attr("r", SPACE/2);
    }

    // Hide all color states
    d3.selectAll(".color-toggle")
    .style("display", "none");

    // Show active color state
    d3.select(`.color-toggle:nth-child(${state.button_state.color + 1})`)
    .style("display", "inline-block");

    // Toggle on Remove button
    d3.select(".btn-remove>i").style("color", (state.button_state.remove)? "red": "#555");

    // Disable undo/redo
    d3.select(".btn-undo").style("color", "#555")
        .style("opacity", 1)
        .style("cursor", "normal");

    d3.select(".btn-redo").style("color", "#555")
        .style("opacity", 1)
        .style("cursor", "normal");

    if (undo_index <= 0) {
        d3.select(".btn-undo").style("opacity", 0.2).style("cursor", "not-allowed");
    }
    if (undo_index >= undo.length - 1) {
        d3.select(".btn-redo").style("opacity", 0.2).style("cursor", "not-allowed");
    }
}

function getTurn() {
    let new_state = getState();
    if (new_state.button_state.color == BOTH) {
        if (moves().length == 0) return BLACK;
        return (moves()[moves().length - 1][2] == BLACK)? WHITE : BLACK;

    } else {
        return new_state.button_state.color;

    }
}

function stoneExists(r, c) {
    return moves().filter(x => x[0] == r && x[1] == c).length != 0;
}

function bounds(r, c) {
    return r >= 1 && r <= 9 && c >= 1 && c <= 9;
}

function push_undo(moveList) {
    undo = undo.slice(0, undo_index + 1);
    undo.push(JSON.parse(JSON.stringify(moveList)));
    undo_index = undo.length - 1;
}

function main() {

    // Board scales to fix container and preserves
    // 600x600 viewbox
    let svg = d3.select(".go-board-area").append("svg")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("viewBox", "0 0 600 600");

    // Create dataset of gridlines
    let gridLines = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let gridPoints = [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]];

    // Draw board
    let hLine = svg.selectAll(".hGrid-line")
        .data(gridLines)
        .enter().append("line")
        .attr("class", "hGrid-line")
        .attr("id", d => `"hGrid-line-${d}"`)
        .attr("x1", SPACE)
        .attr("y1", d => d * SPACE)
        .attr("x2", SIZE - SPACE)
        .attr("y2", d => d * SPACE);

    let vLine = svg.selectAll(".vGrid-line")
        .data(gridLines)
        .enter().append("line")
        .attr("class", "vGrid-line")
        .attr("id", d => `"vGrid-line-${d}"`)
        .attr("x1", d => d * SPACE)
        .attr("y1", SPACE)
        .attr("x2", d => d * SPACE)
        .attr("y2", SIZE - SPACE);

    let points = svg.selectAll(".grid-point")
        .data(gridPoints)
        .enter().append("circle")
        .attr("class", "grid-point")
        .attr("id", d => `"grid-point-${d[1]}-${d[0]}"`)
        .attr("cx", d => d[1] * SPACE + SPACE)
        .attr("cy", d => d[0] * SPACE + SPACE)
        .attr("r", "4");

    push_undo([]);
    render();

    // Stone add/remove click action
    d3.select("svg").on("mouseup", () => {
        let [x, y] = d3.mouse(svg.node());
        let r = Math.floor((y - SPACE/2) / SPACE) + 1;
        let c = Math.floor((x - SPACE/2) / SPACE) + 1;

        let new_state = getState();
        if (!bounds(r, c)) return;

        if (new_state.button_state.remove) { // Remove mode
            let moveList = moves().filter(x => x[0] != r || x[1] != c);
            push_undo(moveList);
            msg();

        } else { // Play mode

            // Place stone of correct color
            if (!stoneExists(r, c)) {
                let moveList = JSON.parse(JSON.stringify(moves()));
                moveList.push([r, c, getTurn()]);
                push_undo(moveList);
                msg();
            }
        }

        render();
    });

    // Preview stone
    d3.select("svg").on("mousemove", () => {
        let [x, y] = d3.mouse(svg.node());
        let r = Math.floor((y - SPACE/2) / SPACE) + 1;
        let c = Math.floor((x - SPACE/2) / SPACE) + 1;

        let new_state = getState();
        new_state.preview = [undefined, undefined, undefined];
        if (!bounds(r, c)) {
            setState(new_state);
            render();
            return;
        }

        if (!stoneExists(r, c)) { // Show stone preview
            if (!new_state.button_state.remove) {
                new_state.preview = [r, c, getTurn()];
            }

        } else {
            // Show remove highlight
            if (new_state.button_state.remove) {
                new_state.preview = [r, c, REMOVE];
            }
        }

        setState(new_state);
        render();
    });

    // Control buttons
    d3.select(".btn-color").on("mouseup", () => {
        let new_state = getState();
        new_state.button_state.color = (new_state.button_state.color + 1) % 3;
        setState(new_state);
        render();
        msg();
    });

    d3.select(".btn-remove").on("mouseup", () => {
        let new_state = getState();
        new_state.button_state.remove = !new_state.button_state.remove;
        setState(new_state);
        render();
        msg();
    });

    d3.select(".btn-clear").on("mouseup", () => {
        if (confirm("Reset game?")) {
            let new_state = getState();
            undo_index = 0;
            undo = [[]];
            new_state.button_state.remove = false;
            new_state.button_state.color  = BOTH;
            setState(new_state);
            render();
            msg();
        }
    });

    d3.select(".btn-undo").on("mouseup", () => {
        if (undo_index > 0) {
            undo_index -= 1;
            render();
            msg();
        }
    });

    d3.select(".btn-redo").on("mouseup", () => {
        if (undo_index < undo.length - 1) {
            undo_index += 1;
            render();
            msg();
        }
    });

    // Multiplayer
    let btnConnect = d3.select(".btn-connect");
    let peerIdArea = d3.select(".peer-id-area");
    let peerID = d3.select("#peer-id");
    let connectFriend = d3.select(".connect-with-friend");
    let friendLabel = d3.select(".friend-id-label");
    let friendInput = d3.select("#friend-peer-id");
    let btnPeerConnect = d3.select(".btn-peer-connect");
    let statusMsg = d3.select(".status-msg");
    let friendArea = d3.select(".friend-area");

    var peer;
    btnConnect.on("mouseup", () => {
        btnConnect.style("display", "none");
        friendArea.style("display", "block");
        peer = new Peer();
        peer.on('open', function(id) {
            peerID.text(id);
        });
        peer.on('connection', function(conn) {
            conn.on('data', function(data) {
                // Receive state
                let obj = JSON.parse(data);
                let newState = getState();
                newState.button_state.color = obj.button_state.color;
                newState.button_state.remove = obj.button_state.remove;
                setState(newState);
                while (undo.length > 0) { // Clear undo
                    undo.pop();
                }
                for (let item of obj.undo) { // Push new undo
                    undo.push(item);
                }
                undo_index = obj.undo_index;
                render();
            });
        });
    });

    btnPeerConnect.on("mouseup", () => {
        let otherid = friendInput.node().value;
        if (otherid != "") {
            conn = peer.connect(otherid);
            conn.on('open', function() {
                connOpen = true;
                console.log("conn open");
                statusMsg.text("You're connected to: " + otherid);
            });
        } else {
            statusMsg.text("Friend's PeerID cannot be empty string");
        }
    });
}

window.onload = main;

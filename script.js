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
    index: 0, // the move the user is looking at in moves array
    moves: [], // history of moves as [r, c, BLACK/WHITE]
    button_state: {
        color: BOTH, // BOTH / BLACK / WHITE
        remove: false
    },
    preview: [undefined, undefined, undefined]
};

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

function clearStones() {
    d3.selectAll(".stone").remove();
}

function render() {
    clearStones();

    let bStone = d3.select("svg").selectAll(".black.stone")
        .data(state.moves.filter(x => x[2] == BLACK))
        .enter().append("circle")
        .attr("class", "black stone")
        .attr("cx", d => d[1] * SPACE)
        .attr("cy", d => d[0] * SPACE)
        .attr("r", SPACE/2);

    let wStone = d3.select("svg").selectAll(".white.stone")
        .data(state.moves.filter(x => x[2] == WHITE))
        .enter().append("circle")
        .attr("class", "white stone")
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
}

function getTurn() {
    let new_state = getState();
    if (new_state.button_state.color == BOTH) {
        if (new_state.moves.length == 0) return BLACK;
        return (new_state.moves[new_state.moves.length - 1][2] == BLACK)? WHITE : BLACK;

    } else {
        return new_state.button_state.color;

    }
}

function stoneExists(r, c) {
    return state.moves.filter(x => x[0] == r && x[1] == c).length != 0;
}

function bounds(r, c) {
    return r >= 1 && r <= 9 && c >= 1 && c <= 9;
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
        .attr("x1", SPACE)
        .attr("y1", d => d * SPACE)
        .attr("x2", SIZE - SPACE)
        .attr("y2", d => d * SPACE);

    let vLine = svg.selectAll(".vGrid-line")
        .data(gridLines)
        .enter().append("line")
        .attr("class", "vGrid-line")
        .attr("x1", d => d * SPACE)
        .attr("y1", SPACE)
        .attr("x2", d => d * SPACE)
        .attr("y2", SIZE - SPACE);

    let points = svg.selectAll(".grid-point")
        .data(gridPoints)
        .enter().append("circle")
        .attr("class", "grid-point")
        .attr("cx", d => d[1] * SPACE + SPACE)
        .attr("cy", d => d[0] * SPACE + SPACE)
        .attr("r", "4");

    render();

    // Stone add/remove click action
    d3.select("svg").on("mouseup", () => {
        let [x, y] = d3.mouse(svg.node());
        let r = Math.floor((y - SPACE/2) / SPACE) + 1;
        let c = Math.floor((x - SPACE/2) / SPACE) + 1;

        let new_state = getState();
        if (!bounds(r, c)) return;

        if (new_state.button_state.remove) { // Remove mode
            new_state.moves = new_state.moves.filter(x => x[0] != r || x[1] != c);

        } else { // Play mode

            // Place stone of correct color
            if (!stoneExists(r, c)) {
                new_state.moves.push([r, c, getTurn()]);
            }

        }

        setState(new_state);
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
    });

    d3.select(".btn-remove").on("mouseup", () => {
        let new_state = getState();
        new_state.button_state.remove = !new_state.button_state.remove;
        setState(new_state);
        render();
    });

    d3.select(".btn-clear").on("mouseup", () => {
        if (confirm("Reset game?")) {
            let new_state = getState();
            new_state.moves = [];
            setState(new_state);
            render();
        }
    });

    d3.select(".btn-undo").on("mouseup", () => {

    });

    d3.select(".btn-redo").on("mouseup", () => {

    });
}

window.onload = main;

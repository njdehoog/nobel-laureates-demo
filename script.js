import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = await d3.csv("assets/nobel-laureates.csv", d => {
    return {
        id: parseInt(d.id),
        category: d["Category"],
        gender: d["Gender"],
    }
});

data = data.filter(d => d.gender !== "org")

console.log(data);
 
 const width = 700;
 const height = 700;

 const circleRadius = 6;
 const center = { x: width / 2, y: height / 2 };

 const categories = Array.from(new Set(data.map(d => d.category)));
const colourScale = d3.scaleOrdinal(categories, d3.schemeTableau10);

 const svg = d3.create("svg")
     .attr("width", width)
     .attr("height", height);


const nodes = data.map((d, index) => {
    return {
        id: index,
        r: circleRadius,
        data: d,
    }
})

initialLayout(nodes);

const circles = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", 0)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("fill", "#CCC");

circles.transition()
    .delay(() => Math.random() * 500)
    .duration(750)
    .attrTween("r", d => {
        const i = d3.interpolate(0, d.r);
        return t => d.r = i(t);
    })

const categoryLabels = svg.append("g")
    .selectAll("text")
    .data(categories)
    .join("text")
    .text(d => d)
    .attr("fill", "#333")
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("style", "filter: drop-shadow(1px 1px 2px rgb(255 255 255)) drop-shadow(-1px -1px 2px rgb(255 255 255)) drop-shadow(-1px 1px 2px rgb(255 255 255)) drop-shadow(1px -1px 2px rgb(255 255 255))")
    .attr("opacity", 0)

const container = d3.select("#chart").node()
container.prepend(svg.node())

const observer = new IntersectionObserver(callback, {
    rootMargin: "0px",
    threshold: 1,
})
const sections = document.querySelectorAll("section");
sections.forEach(section => observer.observe(section))

let currentStep = 0;

function callback(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const section = entry.target;
            const index = Array.from(sections).indexOf(section);
            if (index !== currentStep) {
                currentStep = index;
                console.log("step changed", currentStep);
                updateLayoutForStep(currentStep);
            }
        }
    })
}

function updateLayoutForStep(step) {
    let fill = "#CCC"
    let centroids;

    switch (step) {
        case 0:
            initialLayout(nodes);
            break;
        case 1:
            const layout = clusteredLayout(nodes, "category");
            centroids = layout.centroids;
            fill = d => {
                return colourScale(d.data.category)
            }
            categoryLabels
                .attr("x", d => centroids.get(d).x)
                .attr("y", d => centroids.get(d).y)
            break;
        case 2:
            clusteredLayout(nodes, "gender")
            fill = d => {
                return colourScale(d.data.category)
            }
            break;
    }

    circles.transition()
        .duration(750)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.r)
        .attr("fill", fill)

    showAndHideLabels(step)
}

function showAndHideLabels(step) {
    if (step === 1) {
        categoryLabels.transition()
            .duration(750)
            .attr("opacity", 1)
    } else {
        categoryLabels.transition()
            .duration(750)
            .attr("opacity", 0)
    }
}

function initialLayout(nodes) {
    nodes.forEach(node => {
        delete node.x;
        delete node.y;
    })

    d3.forceSimulation(nodes).stop();


    // center nodes
    nodes.forEach((node) => {
        node.x = node.x + center.x;
        node.y = node.y + center.y;
        node.r = circleRadius;
    });
}

function clusteredLayout(nodes, grouping) {
    const grouped = d3.group(nodes, d => d.data[grouping]);

    const packLayout = d3.pack()
        .size([width, height])
        .padding(10)

    const pack = packLayout(d3.hierarchy(grouped).sum(d => 1))
    const leaves = pack.leaves();

    leaves.forEach((leaf) => {
        const node = nodes.find(node => node.id === leaf.data.id)
        if (!node) {
            console.error("node not found", leaf.data.id)
        }
        node.x = leaf.x
        node.y = leaf.y
    })

    const centroids = d3.rollup(leaves, centroid, d => d.parent.data[0])

    return { nodes, centroids }
}

function centroid(nodes) {
    let x = 0;
    let y = 0;
    let z = 0;
    for (const d of nodes) {
        let k = d.r ** 2;
        x += d.x * k;
        y += d.y * k;
        z += k;
    }
    return { x: x / z, y: y / z };
}
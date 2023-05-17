console.log("contentScript.js is running");

// Send message to background.js / devtools.js
const sendMsgToBackground = (msg) => {
  chrome.runtime.sendMessage(msg);
};

// Listener for messages from background.js
chrome.runtime.onMessage.addListener((msg) => {
  console.log("printing msg received from background.js: ", msg);
  if (request.message === "TabUpdated") {
    // Send performance data again
    initializePerformanceObserver();
  }
});

//Listener for messages from the window
// window.addEventListener("message", (e) => {
//   console.log("printing msg received from the window: ", e);
// });

//This listener only cares if the window is passing an instance of the fiber tree
window.addEventListener("message", (msg) => {
  if (msg.data.type === "FIBER_INSTANCE" || msg.data.type === "UPDATED_FIBER") {
    // console.log(msg.data);
    const bgMsg = {
      type: msg.data.type,
      payload: msg.data.payload,
    };
    sendMsgToBackground(bgMsg);
  }
});

// document.addEventListener("click", (event) => {
//     sendMsgToBackground({
//         click: true,
//         xPosition: event.clientX + document.body.scrollLeft,
//         yPosition: event.clientY + document.body.scrollTop
//       });
//   });

// send metrics data to background.js
function sendMetric(metric) {
  sendMsgToBackground({
    metricName: metric.name,
    value: metric.value,
  });
}

let po;
function initializePerformanceObserver() {
  const po = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      console.log(entry.entryType, entry.name, entry.startTime);
      if (
        entry.entryType === "paint" &&
        entry.name === "first-contentful-paint"
      ) {
        sendMetric({ name: "FCP", value: entry.startTime });
      }
      if (entry.entryType === "largest-contentful-paint") {
        sendMetric({ name: "LCP", value: entry.startTime });
      }
      if (entry.entryType === "layout-shift") {
        sendMetric({ name: "CLS", value: entry.value });
      }
      if (entry.entryType === "longtask") {
        const tbt = entry.duration - 50; // TBT formula\
        sendMetric({ name: "TBT", value: tbt });
      }
      if (entry.entryType === "first-input") {
        sendMetric({
          name: "FID",
          value: entry.processingStart - entry.startTime,
        });
      }
    }
  });

  po.observe({ type: "paint", buffered: true });
  po.observe({ type: "largest-contentful-paint", buffered: true });
  po.observe({ type: "layout-shift", buffered: true });
  po.observe({ type: "longtask", buffered: true });
  po.observe({ type: "first-input", buffered: true });
}

initializePerformanceObserver();

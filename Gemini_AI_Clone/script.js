const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");

// API setup
const API_KEY = "AIzaSyBjrG7lNGOf06LgOdwJfeFap0URAo6CMqw";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let typingInterval,controller;
const chatHistory = [];
const userData = { message: "", file: {} };

// function to create msg element
const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// make API call and generate bot response
// const generateResponse=async(botMsgDiv)=>{

//     const textElement = botMsgDiv.querySelector(".message-text");

//     // add user msg to chat history
//     chatHistory.push({
//         role:"user",
//         parts: [{test: userMessage}]
//     });
//     try{
//         // send the chat history to API to get response
//         const response= await fetch(API_URL,{
//             method:"POST",
//             headers:{"Content-Type": "application/json"} ,
//             body: JSON.stringify({contents: chatHistory})
//         });

//         const data=await response.json();
//         if (!response.ok) throw new Error(data.error.message);

//         // process response text and display it
//         const responseText= data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g,"$1").trim();
//         textElement.textContent=responseText;
//     }
//     catch(error){
//         console.log(error);
//     }
// }

//scroll to the bottom of the container
const scrollToBottom = () =>
  container.scrollTo({
    top: container.scrollHeight,
    behavior: "smooth",
  });

//simulate typing effect for bot response
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;

  //set an interval to type each word
 typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent +=
        (wordIndex === 0 ? "" : " ") + words[wordIndex++];
        scrollToBottom();
      } else {
        clearInterval(typingInterval);
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
    }
  }, 40);
};

// corrected by gpt
// Make API call and generate bot response
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller=new AbortController();


  // Add user message and file data to chat history (fixed)
  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data
        ? [
            {
              inline_data: (({ fileName, isImage, ...rest }) => rest)(
                userData.file
              ),
            },
          ]
        : []),
    ],
    // parts: [{ text: userMessage }] // ✅ Corrected "test" to "text"
  });

  try {
    // Send the chat history to the API (fixed structure)
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: userMessage }], // ✅ Correct request body
          },
        ],
      }),
      signal:controller.signal
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Unknown error");

    // Process response text and display with typing effect
    const responseText = data.candidates[0].content.parts[0].text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .trim();

    // textElement.textContent = responseText;
    typingEffect(responseText, textElement, botMsgDiv);
    chatHistory.push({
      role: "model",
      parts: [{ text: responseText }],
      // parts: [{ text: userMessage }] // ✅ Corrected "test" to "text"
    });
    console.log(chatHistory);
  } catch (error) {
    console.error("Error fetching response:", error);
  } finally {
    userData.file = {};
  }
};

// handle the form submission
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();

  if (!userMessage) return;

  promptInput.value = "";
  userData.message = userMessage;
  document.body.classList.add("bot-responding");
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

  // generate user msg html with optional file attachment
  const userMsgHTML = `<p class="message-text"></p>
    ${
      userData.file.data
        ? userData.file.isImage
          ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
          : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
        : ""
    }`;

  const userMsgDiv = createMsgElement(userMsgHTML, "user-message");

  userMsgDiv.querySelector(".message-text").textContent = userMessage;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    // generate bot msg html and add in the chats container after 600ms
    const botMsgHTML = `<img src="gemini.svg" class="avatar" alt=""><p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");

    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 6);
};

// handle file input change (file upload)
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.starsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    fileInput.value = "";
    const base64string = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add(
      "active",
      isImage ? "img-attached" : "file-attached"
    );

    // store file data in userData object
    userData.file = {
      fileName: file.name,
      data: base64string,
      mime_type,
      isImage,
    };
  };
});

//cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});

//stop ongoing bot response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
  clearInterval(typingInterval);
  chatsContainer.querySelector(".bot-message-laoding").classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

promptForm.addEventListener("submit", handleFormSubmit);
promptForm
  .querySelector("#add-file-btn")
  .addEventListener("click", () => fileInput.click());

//<--- below js part is done by gpt--->//

// // updated by gpt
// const chatsContainer = document.querySelector(".chats-container");
// const promptForm = document.querySelector(".prompt-form");
// const promptInput = promptForm.querySelector(".prompt-input");

// // API setup
// const API_KEY = "AIzaSyBjrG7lNGOf06LgOdwJfeFap0URAo6CMqw";
// const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// let userMessage = "";
// const chatHistory = [];

// // Function to create a message element
// const createMsgElement = (content, ...classes) => {
//     const div = document.createElement("div");
//     div.classList.add("message", ...classes);
//     div.innerHTML = content;
//     return div;
// };

// // Function to format text (preserving Gemini-like output)
// const formatGeminiResponse = (text) => {
//     return text
//         .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>") // Bold text
//         .replace(/\n/g, "<br>"); // Preserve line breaks
// };

// // Generate bot response using Gemini API
// const generateResponse = async (botMsgDiv) => {
//     const textElement = botMsgDiv.querySelector(".message-text");

//     // Add user message to chat history
//     chatHistory.push({
//         role: "user",
//         parts: [{ text: userMessage }]
//     });

//     try {
//         // Send the full chat history to Gemini API
//         const response = await fetch(API_URL, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ contents: chatHistory }) // Preserve chat history
//         });

//         const data = await response.json();
//         if (!response.ok) throw new Error(data.error?.message || "Unknown API error");

//         // Extract the Gemini response
//         const responseText = data.candidates[0].content.parts[0].text.trim();

//         // Add bot response to chat history
//         chatHistory.push({
//             role: "model",
//             parts: [{ text: responseText }]
//         });

//         // Format response (Gemini-like)
//         textElement.innerHTML = formatGeminiResponse(responseText);
//         botMsgDiv.classList.remove("loading");

//     } catch (error) {
//         console.error("Error fetching response:", error);
//         textElement.textContent = "❌ Error: Unable to get a response. Try again!";
//         botMsgDiv.classList.remove("loading");
//     }
// };

// // Handle form submission
// const handleFormSubmit = (e) => {
//     e.preventDefault();
//     userMessage = promptInput.value.trim();

//     if (!userMessage) return;

//     promptInput.value = "";

//     // Display user message
//     const userMsgHTML = `<p class="message-text"></p>`;
//     const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
//     userMsgDiv.querySelector(".message-text").textContent = userMessage;
//     chatsContainer.appendChild(userMsgDiv);

//     setTimeout(() => {
//         // Display bot message placeholder
//         const botMsgHTML = `<img src="gemini.svg" class="avatar" alt=""><p class="message-text">Just a sec...</p>`;
//         const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
//         chatsContainer.appendChild(botMsgDiv);

//         generateResponse(botMsgDiv);
//     }, 600);
// };

// promptForm.addEventListener("submit", handleFormSubmit);

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
    // parts: [{ text: userMessage }] 
  });

  try {
    // Send the chat history to the API (fixed structure)
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: userMessage }], 
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
      // parts: [{ text: userMessage }] 
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

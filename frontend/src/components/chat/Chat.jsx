import { useState } from "react";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

export default function Chat() {

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "System",
      text: "Discussion Started",
      self: false
    }
  ]);

  function sendMessage(text) {

    if (!text.trim()) return;

    const msg = {
      id: Date.now(),
      sender: "You",
      text,
      self: true
    };

    setMessages(prev => [...prev, msg]);
  }

  return (

    <div className="chat-container">

      <ChatHeader />

      <ChatMessages
        messages={messages}
      />

      <ChatInput
        onSend={sendMessage}
      />

    </div>

  );

}
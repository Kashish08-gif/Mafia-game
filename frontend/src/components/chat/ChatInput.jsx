import { useState } from "react";

export default function ChatInput({

    onSend

}){

    const [text,setText]=useState("");

    function handleSend(){

        onSend(text);

        setText("");

    }

    return(

        <div className="chat-input">

            <input

                value={text}

                onChange={e=>setText(e.target.value)}

                placeholder="Type message..."

                onKeyDown={e=>{

                    if(e.key==="Enter")

                        handleSend();

                }}

            />

            <button

                onClick={handleSend}

            >

                Send

            </button>

        </div>

    )

}
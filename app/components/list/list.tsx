import React, { useState, useRef, useCallback, useEffect } from "react";
import Info from "../userInfo/info";
import Chatlist from "./chatList/Chatlist";

type Props = {
  activeUser: any;
  setActiveUser: any;
};

function List({ activeUser, setActiveUser }: Props) {
  const [width, setWidth] = useState(400);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(300);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;

    const deltaX = e.clientX - startXRef.current;
    const newWidth = startWidthRef.current + deltaX;
    
    const constrainedWidth = Math.min(Math.max(newWidth, 300), 600);
    setWidth(constrainedWidth);
  }, []);

  const onMouseUp = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [onMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [width, onMouseMove, onMouseUp]);

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <section
      className="flex flex-col h-full dark:bg-white dark:text-gray-700 border-r-[2px] border-[rgba(255,255,255,0.1)] relative"
      style={{ width: `${width}px` }}
    >
      <Info />
      <Chatlist activeUser={activeUser} setActiveUser={setActiveUser} />
      <div
        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors"
        onMouseDown={handleMouseDown}
        style={{
          cursor: isResizingRef.current ? "col-resize" : "e-resize",
        }}
      />
    </section>
  );
}

export default List;
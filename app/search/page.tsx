import React from "react";
import Search from "./search/search";
import Posts from "./posts/page";
function page() {
  return (
    <div className="size-full flex flex-col md:flex-row">
      <div className="w-full md:w-auto overflow-auto">
        <Search />
      </div>
      <div className="flex-1 h-full border-t md:border-t-0 md:border-l border-[rgba(255,255,255,0.1)] overflow-auto">
        <Posts />
      </div>
    </div>
  );
}

export default page;

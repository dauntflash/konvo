
function ListHeader() {
  return (
    
    <>
      <div className="flex px-4 pt-[2rem] justify-between items-center gap-4 ">
        <div className="flex bg-[rgba(17,25,40,0.66)] h-max py-2 px-5 rounded-md items-center gap-3 w-full">
          <input
            type="search"
            className="bg-transparent border-none outline-none h-[30px] placeholder:opacity-60 w-full text-[20px] px-2"
            placeholder="search"
          />
        </div>
      </div>
    </>
  );
}

export default ListHeader;

import React from "react";

const HeaderBox = ({ type, title, user, subtext }: HeaderBoxProps) => {
  return (
    <div className={`header-box `}>
      <p className="text-12 font-semibold uppercase tracking-[0.16em] text-teal-700">
        Personal overview
      </p>
      <h1 className="header-box-title mt-2">
        {title}
        {type === "greeting" && (
          <span className="text-bankGradient"> {user}</span>
        )}
      </h1>

      <p className="header-box-subtext">{subtext}</p>
    </div>
  );
};

export default HeaderBox;

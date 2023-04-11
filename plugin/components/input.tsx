import * as React from "react";
import { theme } from "../constants/theme";

interface Props extends React.HTMLProps<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, Props>(
  (props, ref) => {
    return (
      <>
        <input
          className={`input ${props.className || ""}`}
          {...props}
          ref={ref}
          style={{
            backgroundColor: "inherit",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontFamily: "inherit",
            fontSize: 14,
            lineHeight: "17px",
            padding: 12,
            width: "100%",
            maxWidth: "100%",
            opacity: props.disabled ? 0.5 : 1,
            ...props.style,
          }}
        />
        <style>
          {`.input:focus-visible { outline: 1px solid ${theme.colors.primary}; }`}
        </style>
      </>
    );
  }
);

import * as React from "react";
import { theme } from "../constants/theme";

interface Props extends React.HTMLProps<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, Props>(
  (props, ref) => {
    return (
      <>
        <textarea
          className={`textarea ${props.className || ""}`}
          rows={4}
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
            resize: 'vertical',
            opacity: props.disabled ? 0.5 : 1,
            ...props.style,
          }}
        />
        <style>
          {`.textarea:focus-visible { outline: 1px solid ${theme.colors.primary}; }`}
        </style>
      </>
    );
  }
);

import {
  createMuiTheme,
  CssBaseline,
  MuiThemeProvider
} from "@material-ui/core";
import green from "@material-ui/core/colors/green";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { theme as themeVars } from "../constants/theme";
import Popup from "./Popup";

const theme = createMuiTheme({
  typography: themeVars.typography,
  palette: {
    primary: { main: themeVars.colors.primary },
    secondary: green
  }
});

chrome.tabs.query({ active: true, currentWindow: true }, tab => {
  ReactDOM.render(
    <MuiThemeProvider theme={theme}>
      <>
        <CssBaseline />
        <Popup />
      </>
    </MuiThemeProvider>,
    document.getElementById("popup")
  );
});

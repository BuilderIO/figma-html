import * as React from "react";
import { Button } from "@material-ui/core";
import "./Popup.scss";

interface AppProps {}

interface AppState {}

export default class Popup extends React.Component<AppProps, AppState> {
  constructor(props: AppProps, state: AppState) {
    super(props, state);
  }

  htmlToFigma() {
    chrome.runtime.sendMessage({ inject: true });
  }

  render() {
    return (
      <div style={{ width: 400, padding: 20 }}>
        <Button
          fullWidth
          size="large"
          variant="contained"
          color="primary"
          onClick={() => this.htmlToFigma()}
        >
          Import current page
        </Button>
      </div>
    );
  }
}

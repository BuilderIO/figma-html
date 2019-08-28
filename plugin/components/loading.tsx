import * as React from "react";
import { makeStyles } from "@material-ui/core/styles";
import LinearProgress from "@material-ui/core/LinearProgress";

const useStyles = makeStyles({
  root: {
    flexGrow: 1
  }
});

export default function Loading(props: { style?: React.CSSProperties }) {
  const classes = useStyles();
  const [completed, setCompleted] = React.useState(0);

  React.useEffect(() => {
    function progress() {
      setCompleted(oldCompleted => {
        if (oldCompleted === 100) {
          return 0;
        }
        const diff = Math.random() * 2;
        return Math.min(oldCompleted + diff, 100);
      });
    }

    const timer = setInterval(progress, 800);
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div style={props.style} className={classes.root}>
      <LinearProgress variant="determinate" value={completed} />
    </div>
  );
}

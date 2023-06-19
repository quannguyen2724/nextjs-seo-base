import React from 'react';

export const Items: React.FC = ({ data, onUpdate, styles, classes }: any) => {
  return (
    <div style={styles.container} className={classes.container}>
      <button onClick={onUpdate}>Update: {data.a}</button>
    </div>
  );
};

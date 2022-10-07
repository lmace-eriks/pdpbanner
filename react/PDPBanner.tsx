import React, { useEffect, useMemo, useRef, useState } from "react";
import { canUseDOM } from "vtex.render-runtime";

// Styles
import styles from "./styles.css";

interface PDPBannerProps {

}

const PDPBanner: StorefrontFunctionComponent<PDPBannerProps> = ({ }) => {

  useEffect(() => {
    console.clear();
  }, [])

  return (
    <div className={styles.container}>
      PDP Banner
    </div>
  )
}

PDPBanner.schema = {
  title: "Footer Expand",
  description: "",
  type: "object",
  properties: {

  }
}

export default PDPBanner;
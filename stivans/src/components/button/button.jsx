import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./button.css";

/**
 * Props:
 * id?: string
 * label?: string
 * type?: 'primary'|'secondary'|'gray'|'light'|'accent'|'inverseAccent'|'icon'|'icon-outlined'
 * action?: (e) => void
 * icon?: string|ReactNode
 * iconPosition?: 'left'|'right'
 * isActive?: boolean
 * options?: Array<{label:string, link?:string}>   // optional; omit if you don't want a dropdown
 * dropdownPosition?: 'left'|'right'
 * externalStyles?: string
 * to?: string
 * disabled?: boolean
 */
const Button = ({
  id,
  label = "",
  type = "primary",
  action,
  icon = null,
  iconPosition = "right",
  isActive = false,
  options = null,                 // ← if null/[], no dropdown is rendered
  dropdownPosition = "left",
  externalStyles = "",
  to,
  disabled = false,
  ...props
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const hasMenu = Array.isArray(options) && options.length > 0;

  // close dropdown when clicking outside
  useEffect(() => {
    if (!hasMenu) return;
    const onDocClick = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [hasMenu]);

  if (!label && !icon && !type) return null;

  const renderIcon = () => (typeof icon === "string" ? <i className={icon} /> : icon);

  const content = (
    <>
      {icon && type !== "icon" && type !== "icon-outlined" && iconPosition === "left" && renderIcon()}
      {label && <span className="btn__label">{label}</span>}
      {icon && type !== "icon" && type !== "icon-outlined" && iconPosition === "right" && renderIcon()}
      {hasMenu && <span className={`btn__caret ${open ? "open" : ""}`}>▾</span>}
      {icon && (type === "icon" || type === "icon-outlined") && renderIcon()}
    </>
  );

  const classes = [
    "btn",
    `btn--${type}`,
    hasMenu ? "has-dropdown" : "",
    isActive ? "button-active" : "",
    externalStyles || "",
  ]
    .filter(Boolean)
    .join(" ");

  const MainEl = to ? Link : "button";
  const mainProps = to
    ? { to, id, className: classes, ...props }
    : {
        id,
        className: classes,
        type: "button",
        disabled,
        onClick: (e) => {
          if (hasMenu) setOpen((v) => !v);
          if (!hasMenu && typeof action === "function") action(e);
        },
        "aria-haspopup": hasMenu || undefined,
        "aria-expanded": hasMenu ? open : undefined,
        ...props,
      };

  return (
    <div className={`btn-wrap ${hasMenu ? "btn-wrap--dropdown" : ""}`} ref={wrapRef}>
      <MainEl {...mainProps}>{content}</MainEl>

      {hasMenu && (
        <div
          className={`btn__menu btn__menu--${dropdownPosition} ${open ? "open" : ""}`}
          role="menu"
        >
          {options.map((opt, i) =>
            opt.link ? (
              <Link
                key={i}
                className="btn__menuItem"
                to={opt.link}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                {opt.label}
              </Link>
            ) : (
              <button
                key={i}
                className="btn__menuItem"
                type="button"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                {opt.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Button;



/* =========================================================================================
   <Button /> — QUICK USAGE NOTES (for src/components/button/button.jsx + button.css)
   Paste this block below your component for reference.
   =========================================================================================

   1) IMPORT
   -----------------------------------------------------------------------------------------
   // Relative path example (adjust if your folder differs):
   // import Button from "../../components/button/button";

   2) BASIC EXAMPLES
   -----------------------------------------------------------------------------------------
   // A) Navigate to a route (renders as <Link>)
   // <Button
   //   id="cta-start"
   //   type="primary"              // 'primary' | 'secondary' | 'gray' | 'light' | 'accent' | 'inverseAccent' | 'icon' | 'icon-outlined'
   //   label="Get Started"
   //   to="/signup"                // when 'to' is present, 'action' is ignored
   // />

   // B) Run a click handler (renders as <button>)
   // <Button
   //   id="cta-browse"
   //   type="secondary"
   //   label="Browse"
   //   action={() => console.log("clicked")}
   // />

   // C) With an icon (Font Awesome class or a ReactNode)
   // <Button
   //   id="cta-icon"
   //   type="primary"
   //   label="Get Started"
   //   icon="fa-solid fa-arrow-right"   // OR icon={<MyIcon />}
   //   iconPosition="right"             // 'left' | 'right'
   // />

   // D) Variants that match your design
   // <Button id="v1" type="primary"       label="Get Started" />
   // <Button id="v2" type="secondary"     label="Get Started" />
   // <Button id="v3" type="gray"          label="Get Started" />
   // <Button id="v4" type="light"         label="Get Started" />
   // <Button id="v5" type="accent"        label="Get Started" />       // white bg, gold text
   // <Button id="v6" type="inverseAccent" label="Get Started" />       // black bg, gold text

   // E) OPTIONAL: Built-in dropdown (only if you pass `options`; safe to omit entirely)
   // <Button
   //   id="browse-menu"                   // give dropdown buttons unique IDs
   //   type="secondary"
   //   label="Browse our Inventory"
   //   options={[
   //     { label: "Motorcycles",          link: "/motorcycles" },
   //     { label: "Parts & Accessories",  link: "/parts-and-accessories" },
   //   ]}
   //   dropdownPosition="right"           // 'left' (default) | 'right'
   // />

   3) PROP REFERENCE
   -----------------------------------------------------------------------------------------
   // id?: string                         // unique (especially for dropdown use)
   // label?: string                      // button text
   // type?: string                       // see variants above
   // action?: (e) => void                // click handler (ignored when `to` is set)
   // to?: string                         // route path -> renders <Link>
   // icon?: string | ReactNode           // e.g., "fa-solid fa-arrow-right" or <Icon/>
   // iconPosition?: 'left' | 'right'     // default 'right'
   // isActive?: boolean                  // forces focus ring style
   // options?: {label, link?}[]          // optional dropdown items; omit for normal button
   // dropdownPosition?: 'left' | 'right' // dropdown alignment (default 'left')
   // externalStyles?: string             // extra className(s) for custom tweaks
   // disabled?: boolean

   4) NOTES / GOTCHAS
   -----------------------------------------------------------------------------------------
   // - Ensure "src/components/button/button.css" is imported inside the component (it is).
   // - If you use Font Awesome class names for icons, include the CDN in index.html:
   //   <link rel="stylesheet"
   //     href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"/>
   // - When `to` is provided, the component navigates (uses <Link>) and does not run `action`.
   // - `options` is entirely optional; if omitted, no dropdown is rendered.
   // - Use `externalStyles` to add context-specific styles, e.g., externalStyles="hero__cta".

   5) QUICK HERO EXAMPLE (CTA on your home hero)
   -----------------------------------------------------------------------------------------
   // <Button
   //   id="hero-get-started"
   //   type="secondary"
   //   label="Get Started"
   //   to="/signup"
   //   externalStyles="hero__cta"   // optional extra styles from the page CSS
   // />

   ========================================================================================= */

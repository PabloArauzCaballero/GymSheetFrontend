/**
 * Dismissal for the numeric keyboards.
 *
 * `number-pad` and `decimal-pad` have no return key on iOS, and unlike Android
 * there is no system back button to close the keyboard with. Every numeric
 * field in this app — the weight/reps/RIR row logged between sets, the body
 * measurements in the profile, the set counts when building a routine — was
 * therefore a dead end on iOS: the pad opens, covers the action button under
 * it, and nothing on screen closes it. Android needed no such affordance,
 * which is exactly why the gap survived to here.
 *
 * React Native already builds the way out; the app simply never asked for it.
 * When a numeric keyboard is paired with a `returnKeyType` it recognises,
 * `RCTTextInputComponentView` attaches a native `UIToolbar` carrying that
 * button and wires it to end editing — see `setDefaultInputAccessoryView` in
 * React/Fabric/Mounting/ComponentViews/TextInput. `inputAccessoryViewButtonLabel`
 * is what puts «Listo» on it instead of the system's English default.
 *
 * That is preferable to hand-rolling an `InputAccessoryView`: the toolbar is
 * the platform's own, so it sits, sizes and themes itself correctly, and there
 * is no root-mounted component to keep in sync with a `nativeID`. (The
 * hand-rolled version was tried first and never appeared on the new
 * architecture — the moment `inputAccessoryViewID` is set, the native side
 * bows out and waits for a view that has to find its way there on its own.)
 */

/**
 * Spread onto any numeric `TextInput`. Kept as one object so a new numeric
 * field cannot pick up half of the behaviour: the toolbar is what stops the
 * field being a dead end, and the dark keyboard is what stops a white slab
 * flashing up under a black screen.
 *
 * All three props are inert on Android, which needs none of them: its numeric
 * keyboards are dismissed with the system back button.
 */
export const numericInputProps = {
  /** Required for the toolbar to exist at all — the label alone is not enough. */
  returnKeyType: 'done',
  inputAccessoryViewButtonLabel: 'Listo',
  keyboardAppearance: 'dark',
} as const;

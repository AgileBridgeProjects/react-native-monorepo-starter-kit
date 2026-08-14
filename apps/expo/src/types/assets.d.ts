declare module '*.png' {
  const asset: number;
  export default asset;
}

// TS2882 (TypeScript 6.0): side-effect imports of CSS files require a module declaration.
declare module '*.css';

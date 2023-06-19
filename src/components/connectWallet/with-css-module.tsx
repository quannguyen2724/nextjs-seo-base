import classes from './connectWallet.module.scss'

export const withCssModule = (Component: React.FC<any>) => (props: any) => {
  return (
    <Component
      {...props}
      classes={classes}
    />
  )
}
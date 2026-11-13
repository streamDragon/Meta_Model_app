import { RuptureWorkshop } from './RuptureWorkshop';
import './sleight-of-mouth.css';
export function RuptureWorkshopPage() {
  return <RuptureWorkshop standalone onReturn={() => { window.location.hash = 'sleight-workshop'; }} onStop={() => { window.location.hash = 'home'; }} />;
}

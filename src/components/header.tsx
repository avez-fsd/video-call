import React from 'react'
import { ReactComponent as IconArrow } from '../assets/icon/arrow.svg';

export default function Header() {
  return (
    <header>
        <button>
            <IconArrow className='icon-arrow' />
        </button>
        
        <div className='center-text'>
            <h3>Create Room</h3> 
        </div>
    </header>
  )
}

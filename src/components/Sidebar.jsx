import { NavLink } from 'react-router-dom'


export default function Sidebar(){
    return(
        <aside className="sidebar">
            <nav>
                <ul>
                    <li>
                        <NavLink to="/dashboard">Inicio</NavLink>
                    </li>
                    <li>
                       <NavLink to="/pacientes">Pacientes</NavLink> 
                    </li>
                     <li>
                       <NavLink to="/expediente">Expedientes</NavLink> 
                    </li>
                     <li>
                       <NavLink to="/admin">Admin</NavLink> 
                    </li>
                </ul>
            </nav>
        </aside>   
    )
}
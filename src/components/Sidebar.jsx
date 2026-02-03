import { Link } from 'react-router-dom'

export default function Sidebar(){
    return(
        <aside className="sidebar">
            <nav>
                <ul>
                    <li>
                        <Link to="/dashboard">Inicio</Link>
                    </li>
                    <li>
                       <Link to="/pacientes">Pacientes</Link> 
                    </li>
                     <li>
                       <Link to="/expediente">Expedientes</Link> 
                    </li>
                     <li>
                       <Link to="/admin">Admin</Link> 
                    </li>
                </ul>
            </nav>
        </aside>   
    )
}
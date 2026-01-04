import Sidebar from '@/components/Sidebar';
import TableOfContents from '@/components/TableOfContents';
import Breadcrumbs from '@/components/Breadcrumbs';
import { SidebarProvider } from '@/lib/sidebar-context';
import SidebarToggle from '@/components/SidebarToggle';
import styles from './layout.module.css';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <div className={styles.layout}>
                <SidebarToggle />
                <Sidebar />
                <main className={styles.main}>
                    <div className={styles.content}>
                        <Breadcrumbs />
                        <article className="prose">
                            {children}
                        </article>
                    </div>
                    <TableOfContents />
                </main>
            </div>
        </SidebarProvider>
    );
}

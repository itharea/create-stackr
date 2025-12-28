import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import Image from 'next/image';
import CodeBlock from '@/components/CodeBlock';
import Callout from '@/components/Callout';
import { PresetComparison } from '@/components/ui/PresetComparison';
import { Table } from '@/components/ui/Table';

export function useMDXComponents(components: MDXComponents): MDXComponents {
    return {
        // Override default link behavior
        a: ({ href, children, ...props }) => {
            if (href?.startsWith('/')) {
                return (
                    <Link href={href} {...props}>
                        {children}
                    </Link>
                );
            }
            if (href?.startsWith('#')) {
                return <a href={href} {...props}>{children}</a>;
            }
            return (
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                    {children}
                </a>
            );
        },
        // Override default image with Next.js Image
        img: (props) => (
            <Image
                alt={props.alt || ''}
                className="rounded-lg"
                {...(props as any)}
            />
        ),
        // Custom components available in MDX files
        CodeBlock,
        Callout,
        PresetComparison,
        Table,
        ...components,
    };
}

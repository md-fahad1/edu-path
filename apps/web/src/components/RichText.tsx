import katex from 'katex';
import 'katex/contrib/mhchem'; // \ce{H2O} rosayoner jonno
import 'katex/dist/katex.min.css';
import { parseRich } from '@/lib/rich';
import { cn } from '@/lib/utils';

function tex(src: string, display: boolean) {
  return katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, maxExpand: 1000 });
}

/** Prosno/option/byakkha-r lekha dekhay: $math$, $$block$$, ![chhobi](url). Shob <span>, tai h3/p/button-er bhitore-o cholbe */
export function RichText({ text, className }: { text: string | null | undefined; className?: string }) {
  const segs = parseRich(text ?? '');
  return (
    <span className={cn('whitespace-pre-line break-words', className)}>
      {segs.map((s, i) => {
        if (s.t === 'text') return s.v;
        if (s.t === 'math') return <span key={i} dangerouslySetInnerHTML={{ __html: tex(s.v, false) }} />;
        if (s.t === 'block') return <span key={i} className="my-2 block overflow-x-auto overflow-y-hidden" dangerouslySetInnerHTML={{ __html: tex(s.v, true) }} />;
        return (
          <img
            key={i} src={s.v} alt={s.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer"
            className="my-2 block max-h-72 max-w-full rounded-lg border border-slate-200 bg-white object-contain"
          />
        );
      })}
    </span>
  );
}
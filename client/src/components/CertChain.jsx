function shortName(value) {
  if (!value) return 'Unknown';
  const cn = value.split(', ').find((p) => p.startsWith('CN='));
  return cn ? cn.slice(3) : value;
}

export default function CertChain({ tls }) {
  if (!tls?.certificate) return null;

  const chain = [
    { role: 'Leaf', cert: tls.certificate },
    ...(tls.certificateChain || []).map((cert, i) => ({
      role: i === (tls.certificateChain?.length || 0) - 1 ? 'Root CA' : 'Intermediate',
      cert,
    })),
  ];

  return (
    <div className="cert-chain">
      <p className="cert-chain-title">Certificate chain</p>
      <div className="cert-chain-stack">
        {chain.map((item, index) => (
          <div
            key={`${item.role}-${index}`}
            className="cert-chain-node"
            style={{ animationDelay: `${index * 200}ms` }}
          >
            <span className="cert-chain-role">{item.role}</span>
            <span className="cert-chain-subject">{shortName(item.cert.subject)}</span>
            <span className="cert-chain-issuer">{shortName(item.cert.issuer)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
